import { Binance } from '../../providers/binance';
import { Taapi } from '../../providers/taapi';
import { round } from '../../utils';
import { AbstractStrategy } from './AbstractStrategy';
import { BollingerConfiguration, Direction, Mode } from './types';

// FIXME: This one was a failed attempt.

export class Bollinger extends AbstractStrategy {
	public configuration: BollingerConfiguration;
	private binance = new Binance();
	private taapi = new Taapi();

	private symbol: string;
	private reference: string;
	private mode: Mode;
	private precision = 0;
	private pricePrecision = 3;
	private stop = false;
	// private pendingOrders: any[] = [];
	// private stopLossIsNextSent = false;
	private notificationsSent = {
		positionIsNowOpen: false,
	};

	constructor(configuration: BollingerConfiguration) {
		super(configuration.symbol);
		this.configuration = configuration;
		this.symbol = this.configuration.symbol.split('/')[0];
		this.reference = this.configuration.symbol.split('/')[1];
		this.pair = `${this.symbol}${this.reference}`;
		this.mode = this.configuration.mode;
	}

	public async init(): Promise<void> {
		await this.binance.setIsolatedLeverage(this.pair, this.configuration.leverage);

		return;
	}

	public async trade(): Promise<boolean> {
		this.precision = await this.binance.getPrecision(this.pair, this.mode);
		this.pricePrecision = await this.binance.getPricePrecision(this.pair, this.mode);

		const currentPrice = await this.binance.getCurrentPrice(this.pair, this.mode);

		// const entry = await this.createEntryIfNeeded();
		// if (entry !== undefined) {
		// 	return entry;
		// }

		// TODO: Check if we are in
		const side = await this.checkPositionIsOpen();
		const entryOrder = await this.getEntryOrder();
		// 1. Get data from bollinger bands
		const bollinger = await this.taapi.getBollingerData(
			`${this.symbol}/${this.reference}`,
			this.configuration.interval,
			5,
		);

		if (!side) {
			// Here, we know we are not in, let's first reset the notification history:
			this.notificationsSent.positionIsNowOpen = false;

			// TODO: Place orders here to open the position.

			// const trend =
			if (currentPrice > bollinger[0].valueMiddleBand) {
				// It may go up, so let's place the upper order
			}

			let trend: Direction | null = null;
			if (
				bollinger[2].valueMiddleBand > bollinger[1].valueMiddleBand &&
				bollinger[1].valueMiddleBand > bollinger[0].valueMiddleBand
			) {
				// Each candle is descending, trend is DOWN (SELL).
				trend = Direction.SELL;
			} else if (
				bollinger[2].valueMiddleBand < bollinger[1].valueMiddleBand &&
				bollinger[1].valueMiddleBand < bollinger[0].valueMiddleBand
			) {
				// Each candle is ascending, trend is UP (BUY).
				trend = Direction.BUY;
			}

			let side: Direction;
			let orderPrice: number;
			if (trend === Direction.BUY) {
				// place a buy order at bottom of bollinger bands
				side = Direction.BUY;
				orderPrice = round(bollinger[0].valueLowerBand, this.pricePrecision);
			} else if (trend === Direction.SELL) {
				// place a sell order at top of bollinger bands
				side = Direction.SELL;
				orderPrice = round(bollinger[0].valueUpperBand, this.pricePrecision);
			} else {
				// No trend, no entry.
				this.log('No trend, better do nothing, delete any existing entry order.');
				if (entryOrder) {
					await this.binance.deleteOrder(this.pair, this.mode, entryOrder.orderId);
				}
				return true;
			}

			if (entryOrder) {
				// We may want to exit here.
				this.log(`There is an entry order at ${entryOrder.price}`);
				this.log(`New target order price is ${orderPrice}`);

				const diffPercentage = Math.abs(
					((+entryOrder.price - orderPrice) / +entryOrder.price) * 100,
				);
				if (diffPercentage < 0.2) {
					// The order is close enough, let's exit.
					return true;
				}
				// Cancel the entry order and place a new one.
				this.log('Cancelling entry order as it is far from the target.');
				await this.binance.deleteOrder(this.pair, this.mode, entryOrder.orderId);
			}

			await this.binance.createOrder(
				this.pair,
				this.mode,
				side,
				this.configuration.entrySize,
				orderPrice,
				'LIMIT',
				'false',
			);
			return true;
			// 2. Check if we are over/below the mean
		}

		// TODO: Just for purpose of testing the strategy, it may be worth for now, not proceed (we'd have only the entry).

		// FROM here, we know we are in.
		if (!this.notificationsSent.positionIsNowOpen) {
			await this.sendNotification(`Bollinger ${side} position is now open, take it over!`);
			this.notificationsSent.positionIsNowOpen = true;
		}

		// TODO: Create the take profit order
		await this.createProfitOrderIfNeeded(bollinger[0].valueMiddleBand);

		// TODO: Create the stop loss order

		return true;
	}

	// private async createEntryIfNeeded() {
	// 	const isOpen = await this.checkPositionIsOpen();
	// 	const currentPrice = await this.binance.getCurrentPrice(this.pair, this.mode);

	// 	// TODO: Adjust to be the size relative to all the balance (also locked)
	// 	// Throw if not enough money to hold all operations though.
	// 	const entrySize = await this.calculateEntrySize(currentPrice);

	// 	if (!isOpen) {
	// 		// TODO: Check if there is an emergency stop, if so, stop the execution (or wait XXX minutes).
	// 		const stop = await this.checkEmergencyStop();

	// 		if (stop) {
	// 			this.sendNotification(
	// 				'Emergency stop triggered because we hit a Stop Loss. Pausing this trade for 8h.',
	// 			);
	// 			this.log('Emergency stop triggered.');
	// 			// TODO: Send an alert, email, sms, slack, (what could it be to arrive to the smart phone?)
	// 			// await new Promise((res) => setTimeout(res, settings.sleep * 1000));
	// 			// TODO: Maybe configurable (now it is 8 hours)
	// 			await new Promise((res) => setTimeout(res, 8 * 60 * 60 * 1000));
	// 			return;
	// 		}

	// 		const entryInPlace = await this.checkEntryOrderExists(entrySize);
	// 		if (this.configuration.entry) {
	// 			if (!entryInPlace) {
	// 				await this.createEntryOrder(entrySize);
	// 			}
	// 			return true;
	// 		}

	// 		this.log(
	// 			`Opening ${this.configuration.direction} position (Market) for ${this.pair}: ${entrySize}@${currentPrice}`,
	// 		);
	// 		await this.binance.createOrder(
	// 			this.pair,
	// 			this.configuration.mode,
	// 			this.configuration.direction,
	// 			entrySize,
	// 			undefined,
	// 			'MARKET',
	// 		);

	// 		// return true;
	// 	}
	// }

	// private async createMartinGalaOrdersIfNeeded() {
	// 	// From this point on, we can be sure we have an open position.
	// 	const inPlace = await this.assertMartinGalaOrdersAreInPlace();
	// 	if (!inPlace && !this.pendingOrders.length) {
	// 		this.log('Got things to do:');

	// 		// TODO: Slowly put orders in place.
	// 		// 1. Call gafas setup
	// 		// 2. Save orders needed in variable
	// 		// 3. Check current orders
	// 		// 4. Remove in-place orders from variable
	// 		// 5. Try to place next order

	// 		const currentPosition = await this.binance.getCurrentPosition(this.pair, this.mode);

	// 		const gafasSetup = await this.gafas.getSetup({
	// 			posicion: this.configuration.direction === 'BUY' ? 'LONG' : 'SHORT',
	// 			recompra: this.configuration.reBuySpacingPercentage,
	// 			monedasx: this.configuration.reBuyAmountPercentage,
	// 			stoploss: this.configuration.stopUsd,
	// 			entrada: +currentPosition.entryPrice,
	// 			monedas: Math.abs(+currentPosition.positionAmt),
	// 		});

	// 		const orders = this.parseGafasSetup(gafasSetup, this.configuration.direction);

	// 		// TODO: Check if they are in place.
	// 		await this.createMartinGalaOrders(orders, this.pair);

	// 		// TODO: Create missing orders
	// 	} else if (this.pendingOrders.length) {
	// 		const orders = this.pendingOrders;
	// 		this.pendingOrders = [];
	// 		await this.createMartinGalaOrders(orders, this.pair);
	// 	}
	// }

	// private async verifyMartinGalaOrdersSanity() {
	// 	const currentPosition = await this.binance.getCurrentPosition(this.pair, this.mode);
	// 	const liquidationPrice = +currentPosition.liquidationPrice;
	// 	const currentPrice = await this.binance.getCurrentPrice(this.pair, this.mode);

	// 	const orders = await this.binance.getCurrentOrders(this.pair, this.mode);
	// 	const martinGalaOrders = orders.filter((order) =>
	// 		['LIMIT', 'STOP_MARKET'].includes(order.type),
	// 	);

	// 	if (
	// 		martinGalaOrders.length === 1 &&
	// 		martinGalaOrders[0].type === 'STOP_MARKET' &&
	// 		!this.stopLossIsNextSent
	// 	) {
	// 		// TODO: Activate emergency protocol
	// 		this.stopLossIsNextSent = true;
	// 		this.sendNotification('CRITICAL: Next order is the Stop Loss.');
	// 		this.error('CRITICAL: Next order is the Stop Loss.');
	// 	}

	// 	if (!martinGalaOrders.length) {
	// 		// TODO: We could have an strategy here to reduce losses, kind of a trailing, or reduce the benefit desired, etc
	// 		this.sendNotification('CRITICAL: No more martin gala orders found.');
	// 		this.error('CRITICAL: No more martin gala orders found.');
	// 		return;
	// 	}

	// 	let closest = martinGalaOrders[0];
	// 	martinGalaOrders.forEach((order) => {
	// 		if (Math.abs(+order.price - currentPrice) < Math.abs(+closest.price - currentPrice)) {
	// 			closest = order;
	// 		}
	// 	});

	// 	if (
	// 		(this.configuration.direction === 'BUY' && closest.price < liquidationPrice) ||
	// 		(this.configuration.direction === 'SELL' && closest.price > liquidationPrice)
	// 	) {
	// 		this.log(
	// 			'Careful! We are moving a martin gala order because it was further than the liquidation price.',
	// 		);
	// 		this.sendNotification(
	// 			'CAREFUL! We are moving a martin gala order because it was further than the liquidation price.',
	// 		);
	// 		const multiplier = this.configuration.direction === 'BUY' ? 1.001 : 0.999;
	// 		const newPrice = round(liquidationPrice * multiplier, this.pricePrecision);
	// 		await this.binance.deleteOrder(this.pair, this.mode, closest.orderId);

	// 		await this.createMartinGalaOrders(
	// 			[
	// 				{
	// 					side: closest.side,
	// 					type: closest.origType,
	// 					quantity: closest.origQty,
	// 					price: newPrice,
	// 					reduceOnly: `${closest.reduceOnly}`,
	// 				},
	// 			],
	// 			this.pair,
	// 		);
	// 	}
	// }

	// private async assertMartinGalaOrdersAreInPlace(): Promise<boolean> {
	// 	const orders = await this.binance.getCurrentOrders(this.pair, this.mode);
	// 	const position = await this.binance.getCurrentPosition(this.pair, this.mode);

	// 	const inPlace = orders.some(
	// 		(order) =>
	// 			order.side === this.configuration.direction &&
	// 			order.type === 'LIMIT' &&
	// 			((this.configuration.direction === 'BUY' && order.price < position.entryPrice) ||
	// 				(this.configuration.direction === 'SELL' && order.price > position.entryPrice)),
	// 	);

	// 	return inPlace;
	// }

	// private parseGafasSetup(gafasSetup: any, side: string) {
	// 	const reBuys = gafasSetup
	// 		.filter((order) => order.numero.indexOf('SL') === -1)
	// 		.map((order) => ({
	// 			price: round(+order.precio, this.pricePrecision),
	// 			quantity: round(+order.monedas, this.precision),
	// 			type: 'LIMIT',
	// 			side: side === 'BUY' ? 'BUY' : 'SELL',
	// 			reduceOnly: 'false',
	// 		}));

	// 	const stop = gafasSetup.find((order) => order.numero.indexOf('SL') !== -1);

	// 	return [
	// 		...reBuys,
	// 		{
	// 			price: round(+stop.precio, this.pricePrecision),
	// 			quantity: round(+stop.monedas, this.precision),
	// 			type: 'STOP_MARKET',
	// 			side: side === 'BUY' ? 'SELL' : 'BUY',
	// 			reduceOnly: 'true',
	// 		},
	// 	];
	// }

	// private async createMartinGalaOrders(orders, pair): Promise<void> {
	// 	for (const order of orders) {
	// 		this.log(`Creating order ${order.side}/${order.type} ${order.quantity}@${order.price}`);
	// 		try {
	// 			await this.binance.createOrder(
	// 				pair,
	// 				this.configuration.mode,
	// 				order.side,
	// 				order.quantity,
	// 				order.price,
	// 				order.type,
	// 				order.reduceOnly,
	// 			);
	// 		} catch (err: any) {
	// 			this.pendingOrders.push(order);
	// 			this.error({ message: err.message, code: err.code, url: err.url });
	// 		}
	// 	}
	// }

	private async checkPositionIsOpen(): Promise<false | Direction> {
		const position = await this.binance.getCurrentPosition(this.pair, this.mode);
		if (+position?.positionAmt !== 0) {
			return +position?.positionAmt > 0 ? Direction.BUY : Direction.SELL;
		}
		return false;
	}

	private async getEntryOrder(): Promise<any> {
		const orders = await this.binance.getCurrentOrders(this.pair, this.mode);

		if (
			orders.length === 1 &&
			orders[0].type === 'LIMIT' &&
			+orders[0].origQty === this.configuration.entrySize
		) {
			return orders[0];
		}
		null;
	}

	// private async createEntryOrder(entrySize: number) {
	// 	if (this.configuration.entry?.price) {
	// 		this.log(
	// 			`Placing ${this.configuration.direction}/LIMIT entry order for ${this.pair}: ${entrySize}@${this.configuration.entry.price}`,
	// 		);

	// 		await this.binance.createOrder(
	// 			this.pair,
	// 			this.configuration.mode,
	// 			this.configuration.direction,
	// 			entrySize,
	// 			this.configuration.entry.price,
	// 			'LIMIT',
	// 			'false',
	// 		);
	// 	} else if (
	// 		this.configuration.entry?.activationPercentage &&
	// 		this.configuration.entry?.callbackPercentage
	// 	) {
	// 		const currentPrice = await this.binance.getCurrentPrice(this.pair, this.mode);
	// 		const activationPrice =
	// 			this.configuration.direction === 'BUY'
	// 				? +currentPrice *
	// 				  (1 -
	// 						(this.configuration.entry.activationPercentage / 100 +
	// 							this.configuration.entry.callbackPercentage / 100))
	// 				: +currentPrice *
	// 				  (1 +
	// 						(this.configuration.entry.activationPercentage / 100 +
	// 							this.configuration.entry.callbackPercentage / 100));

	// 		// First check if order already there, and if price is valid.
	// 		const orders = await this.binance.getCurrentOrders(this.pair, this.mode);
	// 		const oldActivationPrice = +orders[0]?.activatePrice;

	// 		if (
	// 			orders[0]?.type === 'TRAILING_STOP_MARKET' &&
	// 			((this.configuration.direction === 'BUY' && oldActivationPrice >= activationPrice) ||
	// 				(this.configuration.direction === 'SELL' && oldActivationPrice <= activationPrice))
	// 		) {
	// 			// Trailing in place and current price is still valid.
	// 			return;
	// 		}

	// 		if (orders[0]?.type === 'TRAILING_STOP_MARKET') {
	// 			this.log('Deleting old TRAILING entry as price has gone the other direction');
	// 			await this.binance.deleteOrder(this.pair, this.mode, orders[0].orderId);
	// 		}

	// 		this.log(
	// 			`Placing ${this.configuration.direction}/TRAILING(${this.configuration.entry.callbackPercentage}%) entry order for ${this.pair}: ${entrySize}@${activationPrice}(${this.configuration.entry.activationPercentage}%)`,
	// 		);

	// 		await this.binance.createOrder(
	// 			this.pair,
	// 			this.configuration.mode,
	// 			this.configuration.direction,
	// 			entrySize,
	// 			round(activationPrice, this.pricePrecision),
	// 			'TRAILING_STOP_MARKET',
	// 			'false',
	// 			this.configuration.entry.callbackPercentage,
	// 		);
	// 	}
	// }

	// private async calculateEntrySize(currentPrice: number) {
	// 	const balance = await this.binance.getCurrentBalance(this.reference, this.mode);

	// 	let amountToBuy = round(
	// 		(((balance * this.configuration.entryPercentage) / 100) * this.configuration.leverage) /
	// 			currentPrice,
	// 		this.precision,
	// 	);

	// 	while (amountToBuy * currentPrice < 5) {
	// 		amountToBuy = round(amountToBuy + Math.pow(10, -this.precision), this.precision);
	// 	}
	// 	return amountToBuy;
	// }

	// private async checkEmergencyStop() {
	// 	if (this.stop === true) {
	// 		return true;
	// 	}

	// 	// if there was a stop withing the last 5 minutes, then set to true.
	// 	const last5Mins = await this.binance.getFilledOrders(this.pair, this.mode, {
	// 		start: new Date(Date.now() - 5 * 60 * 1000),
	// 		end: new Date(Date.now()),
	// 	});

	// 	const stop = last5Mins.find(
	// 		(order) => order.type === 'STOP_MARKET' && order.side !== this.configuration.direction,
	// 	);

	// 	if (stop) {
	// 		this.stop = true;
	// 		return true;
	// 	}
	// 	return false;
	// }

	private async createProfitOrderIfNeeded(profitPrice: number) {
		const currentPosition = await this.binance.getCurrentPosition(this.pair, this.mode);
		const positionSide = +currentPosition?.positionAmt > 0 ? Direction.BUY : Direction.SELL;
		const positionAmt = Math.abs(+currentPosition?.positionAmt);
		const open = await this.binance.getCurrentOrders(this.pair, this.mode);
		const profitOrder = open.find(
			(order) => order.type === 'TRAILING_STOP_MARKET' && order.side !== positionSide,
		);

		if (profitOrder) {
			if (profitOrder.time !== profitOrder.updateTime) {
				// Order is probably a trailing stop that was already triggered, don't delete it.
				return;
			}
			// Order already in place, check if amount and value are ok, or remove to create a new one otherwise.
			const diffPercentage = Math.abs(
				((+profitOrder.activatePrice - profitPrice) / +profitOrder.activatePrice) * 100,
			);
			if (+profitOrder.origQty === positionAmt && diffPercentage < 0.1) {
				return;
			}
			this.log('Deleting past profit order.');
			await this.binance.deleteOrder(this.pair, this.mode, profitOrder.orderId);
		}

		const direction = positionSide === 'BUY' ? 'SELL' : 'BUY';
		this.log(
			`Creating profit order ${direction}/TRAILING_STOP_MARKET ${positionAmt}@${profitPrice}`,
		);
		await this.binance.createOrder(
			this.pair,
			this.configuration.mode,
			direction,
			positionAmt,
			round(profitPrice, this.pricePrecision),
			'TRAILING_STOP_MARKET',
			'true',
			0.2,
		);
	}
}
