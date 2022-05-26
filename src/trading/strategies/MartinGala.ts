import { Binance } from '../../providers/binance';
import { Gafas } from '../../providers/gafas';
import { round } from '../../utils';
import { AbstractStrategy } from './AbstractStrategy';
import { MartinGalaConfiguration, Mode } from './types';

export class MartinGala extends AbstractStrategy {
	public configuration: MartinGalaConfiguration;
	private binance = new Binance();
	private gafas = new Gafas();
	private symbol: string;
	private reference: string;
	private mode: Mode;
	private precision = 0;
	private pricePrecision = 3;
	private stop = false;
	private pendingOrders: any[] = [];
	private stopLossIsNextSent = false;

	constructor(configuration: MartinGalaConfiguration) {
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

		const entry = await this.createEntryIfNeeded();
		if (entry !== undefined) {
			return entry;
		}

		await this.createMartinGalaOrdersIfNeeded();

		await this.verifyMartinGalaOrdersSanity();

		await this.createProfitOrderIfNeeded();

		// TODO: Check when we are in profit, if so, move the takeProfit / stop loss (kind of a trailing stop)

		// TODO: Return only when trade is closed.
		return true;
	}

	private async createEntryIfNeeded() {
		const isOpen = await this.checkPositionIsOpen();
		const currentPrice = await this.binance.getCurrentPrice(this.pair, this.mode);

		// TODO: Adjust to be the size relative to all the balance (also locked)
		// Throw if not enough money to hold all operations though.
		const entrySize = await this.calculateEntrySize(currentPrice);

		if (!isOpen) {
			// TODO: Check if there is an emergency stop, if so, stop the execution (or wait XXX minutes).
			const stop = await this.checkEmergencyStop();

			if (stop) {
				this.sendNotification(
					'Emergency stop triggered because we hit a Stop Loss. Pausing this trade for 8h.',
				);
				this.log('Emergency stop triggered.');
				// TODO: Send an alert, email, sms, slack, (what could it be to arrive to the smart phone?)
				// await new Promise((res) => setTimeout(res, settings.sleep * 1000));
				// TODO: Maybe configurable (now it is 8 hours)
				await new Promise((res) => setTimeout(res, 8 * 60 * 60 * 1000));
				return;
			}

			const entryInPlace = await this.checkEntryOrderExists(entrySize);
			if (this.configuration.entry) {
				if (!entryInPlace) {
					await this.createEntryOrder(entrySize);
				}
				return true;
			}

			this.log(
				`Opening ${this.configuration.direction} position (Market) for ${this.pair}: ${entrySize}@${currentPrice}`,
			);
			await this.binance.createOrder(
				this.pair,
				this.configuration.mode,
				this.configuration.direction,
				entrySize,
				undefined,
				'MARKET',
			);

			// return true;
		}
	}

	private async createMartinGalaOrdersIfNeeded() {
		// From this point on, we can be sure we have an open position.
		const inPlace = await this.assertMartinGalaOrdersAreInPlace();
		this.log(`inPlace: ${inPlace}, pendingOrders: ${this.pendingOrders.length}`);
		if (!inPlace && !this.pendingOrders.length) {
			this.log('Got things to do:');

			// TODO: Slowly put orders in place.
			// 1. Call gafas setup
			// 2. Save orders needed in variable
			// 3. Check current orders
			// 4. Remove in-place orders from variable
			// 5. Try to place next order

			const currentPosition = await this.binance.getCurrentPosition(this.pair, this.mode);

			const gafasSetup = await this.gafas.getSetup({
				posicion: this.configuration.direction === 'BUY' ? 'LONG' : 'SHORT',
				recompra: this.configuration.reBuySpacingPercentage,
				monedasx: this.configuration.reBuyAmountPercentage,
				stoploss: this.configuration.stopUsd,
				entrada: +currentPosition.entryPrice,
				monedas: Math.abs(+currentPosition.positionAmt),
			});

			const orders = this.parseGafasSetup(gafasSetup, this.configuration.direction);

			// TODO: Check if they are in place.
			await this.createMartinGalaOrders(orders, this.pair);

			// TODO: Create missing orders
		} else if (this.pendingOrders.length) {
			const orders = this.pendingOrders;
			this.pendingOrders = [];
			await this.createMartinGalaOrders(orders, this.pair);
		}
	}

	private async verifyMartinGalaOrdersSanity() {
		const currentPosition = await this.binance.getCurrentPosition(this.pair, this.mode);
		const liquidationPrice = +currentPosition.liquidationPrice;
		const currentPrice = await this.binance.getCurrentPrice(this.pair, this.mode);

		const orders = await this.binance.getCurrentOrders(this.pair, this.mode);
		const martinGalaOrders = orders.filter((order) =>
			['LIMIT', 'STOP_MARKET'].includes(order.type),
		);

		if (
			martinGalaOrders.length === 1 &&
			martinGalaOrders[0].type === 'STOP_MARKET' &&
			!this.stopLossIsNextSent
		) {
			// TODO: Activate emergency protocol
			this.stopLossIsNextSent = true;
			this.sendNotification('CRITICAL: Next order is the Stop Loss.');
			this.error('CRITICAL: Next order is the Stop Loss.');
		}

		if (!martinGalaOrders.length) {
			// TODO: We could have an strategy here to reduce losses, kind of a trailing, or reduce the benefit desired, etc
			this.sendNotification('CRITICAL: No more martin gala orders found.');
			this.error('CRITICAL: No more martin gala orders found.');
			return;
		}

		let closest = martinGalaOrders[0];
		martinGalaOrders.forEach((order) => {
			if (Math.abs(+order.price - currentPrice) < Math.abs(+closest.price - currentPrice)) {
				closest = order;
			}
		});

		if (
			(this.configuration.direction === 'BUY' && closest.price < liquidationPrice) ||
			(this.configuration.direction === 'SELL' && closest.price > liquidationPrice)
		) {
			this.log(
				'Careful! We are moving a martin gala order because it was further than the liquidation price.',
			);
			await this.sendNotification(
				'CAREFUL! We are moving a martin gala order because it was further than the liquidation price.',
			);
			const multiplier = this.configuration.direction === 'BUY' ? 1.001 : 0.999;
			const newPrice = round(liquidationPrice * multiplier, this.pricePrecision);
			await this.binance.deleteOrder(this.pair, this.mode, closest.orderId);

			await this.createMartinGalaOrders(
				[
					{
						side: closest.side,
						type: closest.origType,
						quantity: closest.origQty,
						price: newPrice,
						reduceOnly: `${closest.reduceOnly}`,
					},
				],
				this.pair,
			);
		}
	}

	private async assertMartinGalaOrdersAreInPlace(): Promise<boolean> {
		const orders = await this.binance.getCurrentOrders(this.pair, this.mode);
		const position = await this.binance.getCurrentPosition(this.pair, this.mode);

		const inPlace = orders.some(
			(order) =>
				order.side === this.configuration.direction &&
				order.type === 'LIMIT' &&
				((this.configuration.direction === 'BUY' && order.price < position.entryPrice) ||
					(this.configuration.direction === 'SELL' && order.price > position.entryPrice)),
		);

		return inPlace;
	}

	private parseGafasSetup(gafasSetup: any, side: string) {
		const reBuys = gafasSetup
			.filter((order) => order.numero.indexOf('SL') === -1)
			.map((order) => ({
				price: round(+order.precio, this.pricePrecision),
				quantity: round(+order.monedas, this.precision),
				type: 'LIMIT',
				side: side === 'BUY' ? 'BUY' : 'SELL',
				reduceOnly: 'false',
			}));

		const stop = gafasSetup.find((order) => order.numero.indexOf('SL') !== -1);

		return [
			...reBuys,
			{
				price: round(+stop.precio, this.pricePrecision),
				quantity: round(+stop.monedas, this.precision),
				type: 'STOP_MARKET',
				side: side === 'BUY' ? 'SELL' : 'BUY',
				reduceOnly: 'true',
			},
		];
	}

	private async createMartinGalaOrders(orders, pair): Promise<void> {
		for (const order of orders) {
			this.log(`Creating order ${order.side}/${order.type} ${order.quantity}@${order.price}`);
			try {
				await this.binance.createOrder(
					pair,
					this.configuration.mode,
					order.side,
					order.quantity,
					order.price,
					order.type,
					order.reduceOnly,
				);
			} catch (err: any) {
				this.pendingOrders.push(order);
				this.error({ message: err.message, code: err.code, url: err.url });
			}
		}
	}

	private async checkPositionIsOpen(): Promise<boolean> {
		const position = await this.binance.getCurrentPosition(this.pair, this.mode);
		if (+position?.positionAmt !== 0) {
			return true;
		}
		return false;
	}

	private async checkEntryOrderExists(amount: number): Promise<boolean> {
		const orders = await this.binance.getCurrentOrders(this.pair, this.mode);

		if (
			orders.length === 1 &&
			orders[0].type === 'LIMIT' &&
			orders[0].side === this.configuration.direction &&
			+orders[0].origQty === amount
		) {
			return true;
		}

		if (
			orders.length === 1 &&
			orders[0].type === 'TRAILING_STOP_MARKET' &&
			orders[0].side === this.configuration.direction &&
			+orders[0].origQty === amount
		) {
			return false;
		}

		if (orders.length === 0) {
			this.log('Resetting pendingOrders array.');
			this.pendingOrders = [];
			this.stopLossIsNextSent = false;
			return false;
		}

		this.log('Removing past order and resetting pendingOrders array.');
		await this.binance.deleteAllOrders(this.pair, this.mode);
		this.pendingOrders = [];
		this.stopLossIsNextSent = false;
		return false;
	}

	private async createEntryOrder(entrySize: number) {
		if (this.configuration.entry?.price) {
			this.log(
				`Placing ${this.configuration.direction}/LIMIT entry order for ${this.pair}: ${entrySize}@${this.configuration.entry.price}`,
			);

			await this.binance.createOrder(
				this.pair,
				this.configuration.mode,
				this.configuration.direction,
				entrySize,
				this.configuration.entry.price,
				'LIMIT',
				'false',
			);
		} else if (
			this.configuration.entry?.activationPercentage &&
			this.configuration.entry?.callbackPercentage
		) {
			const currentPrice = await this.binance.getCurrentPrice(this.pair, this.mode);
			const activationPrice =
				this.configuration.direction === 'BUY'
					? +currentPrice *
					  (1 -
							(this.configuration.entry.activationPercentage / 100 +
								this.configuration.entry.callbackPercentage / 100))
					: +currentPrice *
					  (1 +
							(this.configuration.entry.activationPercentage / 100 +
								this.configuration.entry.callbackPercentage / 100));

			// First check if order already there, and if price is valid.
			const orders = await this.binance.getCurrentOrders(this.pair, this.mode);
			const oldActivationPrice = +orders[0]?.activatePrice;

			if (
				orders[0]?.type === 'TRAILING_STOP_MARKET' &&
				((this.configuration.direction === 'BUY' && oldActivationPrice >= activationPrice) ||
					(this.configuration.direction === 'SELL' && oldActivationPrice <= activationPrice))
			) {
				// Trailing in place and current price is still valid.
				return;
			}

			if (orders[0]?.type === 'TRAILING_STOP_MARKET') {
				this.log('Deleting old TRAILING entry as price has gone the other direction');
				await this.binance.deleteOrder(this.pair, this.mode, orders[0].orderId);
			}

			this.log(
				`Placing ${this.configuration.direction}/TRAILING(${this.configuration.entry.callbackPercentage}%) entry order for ${this.pair}: ${entrySize}@${activationPrice}(${this.configuration.entry.activationPercentage}%)`,
			);

			await this.binance.createOrder(
				this.pair,
				this.configuration.mode,
				this.configuration.direction,
				entrySize,
				round(activationPrice, this.pricePrecision),
				'TRAILING_STOP_MARKET',
				'false',
				this.configuration.entry.callbackPercentage,
			);
		}
	}

	private async calculateEntrySize(currentPrice: number) {
		const balance = await this.binance.getCurrentBalance(this.reference, this.mode);
		const entrySize = this.configuration.entryPercentage
			? (balance * this.configuration.entryPercentage) / 100
			: this.configuration.entrySize;

		if (!entrySize) {
			throw new Error('Entry size is not defined');
		}

		let amountToBuy = round(
			(entrySize * this.configuration.leverage) / currentPrice,
			this.precision,
		);

		while (amountToBuy * currentPrice < 5) {
			amountToBuy = round(amountToBuy + Math.pow(10, -this.precision), this.precision);
		}
		return amountToBuy;
	}

	private async checkEmergencyStop() {
		if (this.stop === true) {
			return true;
		}

		// if there was a stop withing the last 5 minutes, then set to true.
		const last5Mins = await this.binance.getFilledOrders(this.pair, this.mode, {
			start: new Date(Date.now() - 5 * 60 * 1000),
			end: new Date(Date.now()),
		});

		const stop = last5Mins.find(
			(order) => order.type === 'STOP_MARKET' && order.side !== this.configuration.direction,
		);

		if (stop) {
			this.stop = true;
			return true;
		}
		return false;
	}

	private async createProfitOrderIfNeeded() {
		const currentPosition = await this.binance.getCurrentPosition(this.pair, this.mode);
		const positionAmt = Math.abs(+currentPosition?.positionAmt);
		const open = await this.binance.getCurrentOrders(this.pair, this.mode);
		const profitOrder = open.find(
			(order) =>
				order.type === 'TRAILING_STOP_MARKET' && order.side !== this.configuration.direction,
		);
		if (profitOrder) {
			// Order already in place, check if amount is ok, or remove to create a new one otherwise.
			if (+profitOrder.origQty === positionAmt) {
				return;
			}
			this.log('Deleting past profit order.');
			await this.binance.deleteOrder(this.pair, this.mode, profitOrder.orderId);
		}

		// TODO: Verify both direction's profit
		const profitPrice =
			this.configuration.direction === 'BUY'
				? +currentPosition.entryPrice *
				  (1 +
						(this.configuration.profitPercentage + this.configuration.profitCallbackPercentage) /
							(100 * this.configuration.leverage))
				: +currentPosition.entryPrice *
				  (1 -
						(this.configuration.profitPercentage + this.configuration.profitCallbackPercentage) /
							(100 * this.configuration.leverage));

		const direction = this.configuration.direction === 'BUY' ? 'SELL' : 'BUY';
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
			this.configuration.profitCallbackPercentage,
		);
	}
}
