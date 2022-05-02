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
	private pair: string;
	private mode: Mode;
	private precision = 0;
	private state = {
		lastOperationPrice: 0,
		nextBuyPrice: 0,
		nextSellPrice: 0,
	};
	private pendingOrders: any[] = [];

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

		const entry = await this.createEntryIfNeeded();
		if (entry !== undefined) {
			return entry;
		}

		await this.createMartinGalaOrdersIfNeeded();

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
				// TODO: Antes funcionaba con 4, no me gusta tener solo 3 aqui. El trailing si que va con 4...
				price: round(+order.precio, 3),
				quantity: round(+order.monedas, this.precision),
				type: 'LIMIT',
				side: side === 'BUY' ? 'BUY' : 'SELL',
				reduceOnly: 'false',
			}));

		const stop = gafasSetup.find((order) => order.numero.indexOf('SL') !== -1);

		return [
			...reBuys,
			{
				// TODO: Does this one needs to be stop_market?
				price: round(+stop.precio, 4),
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
			return false;
		}

		this.log('Removing past order and resetting pendingOrders array.');
		await this.binance.deleteAllOrders(this.pair, this.mode);
		this.pendingOrders = [];
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
				round(activationPrice, 4),
				'TRAILING_STOP_MARKET',
				'false',
				this.configuration.entry.callbackPercentage,
			);
		}
	}

	private async calculateEntrySize(currentPrice: number) {
		const balance = await this.binance.getCurrentBalance(this.reference, this.mode);

		const precision = await this.binance.getPrecision(this.pair, this.mode);

		let amountToBuy = round(
			(((balance * this.configuration.startSize) / 100) * this.configuration.leverage) /
				currentPrice,
			precision,
		);

		while (amountToBuy * currentPrice < 5) {
			amountToBuy = round(amountToBuy + 1, precision);
		}
		return amountToBuy;
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
			round(profitPrice, 4),
			'TRAILING_STOP_MARKET',
			'true',
			this.configuration.profitCallbackPercentage,
		);
	}
}
