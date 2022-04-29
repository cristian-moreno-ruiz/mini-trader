import { Binance } from '../../providers/binance';
import { Gafas } from '../../providers/gafas';
import { round } from '../../utils';
import { AbstractStrategy } from './AbstractStrategy';
import { MartinGalaConfiguration, Mode } from './types';

export class MartinGala implements AbstractStrategy {
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
		const symbol = this.configuration.symbol.split('/')[0];
		const reference = this.configuration.symbol.split('/')[1];
		const pair = `${symbol}${reference}`;

		// TODO: Not start in Market, put order limit, check when is activated, add then rebuy and profit orders.
		// const tradeIsActive = await this.assertTradeIsActive(pair);

		// if (!tradeIsActive) {
		// 	const finished = this.checkIfTradeIsFinished();
		// 	if (finished) {
		// 		return false;
		// 	}
		// 	const order = await this.assertOrderToActivateTradeIsThere(pair);
		// 	if (!order) {
		// 		await this.createOrderToActivateTrade(pair);
		// 	}
		// 	return true;
		// }

		const inPlace = await this.assertMartinGalaOrdersAreInPlace();
		const isOpen = await this.checkPositionIsOpen();
		const currentPrice = await this.binance.getCurrentPrice(pair, this.mode);
		this.precision = await this.binance.getPrecision(this.pair, this.mode);

		// TODO: Adjust to be the size relative to all the balance (also locked)
		// Throw if not enough money to hold all operations though.
		const entrySize = await this.calculateEntrySize(currentPrice);

		if (!isOpen) {
			const entryInPlace = await this.checkEntryOrderExists(entrySize);
			if (this.configuration.entryPrice) {
				if (!entryInPlace) {
					console.log(`Placing entry order for ${pair}`);
					await this.binance.createOrder(
						pair,
						this.configuration.mode,
						this.configuration.direction,
						entrySize,
						this.configuration.entryPrice,
						'LIMIT',
						'false',
					);
				}
				return true;
			}

			console.log(`Opening position for ${pair}`);
			await this.binance.createOrder(
				pair,
				this.configuration.mode,
				this.configuration.direction,
				entrySize,
				undefined,
				'MARKET',
			);

			// return true;
		}

		// From this point on, we can be sure we have an open position.

		if (!inPlace && !this.pendingOrders.length) {
			console.log('Got things to do:');

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
				monedas: +currentPosition.positionAmt,
			});

			const orders = await this.parseGafasSetup(gafasSetup, this.configuration.direction);

			// TODO: Check if they are in place.
			await this.createMartinGalaOrders(orders, pair);

			// TODO: Create missing orders
		} else if (this.pendingOrders.length) {
			const orders = this.pendingOrders;
			this.pendingOrders = [];
			await this.createMartinGalaOrders(orders, pair);
		}

		await this.createProfitOrderIfNeeded();

		// TODO: Check when we are in profit, if so, move the takeProfit / stop loss (kind of a trailing stop)

		// TODO: Return only when trade is closed.
		return true;
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
				price: round(+order.precio, 4),
				quantity: round(+order.monedas, this.precision),
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
				side: side === 'BUY' ? 'SELL' : 'BUY',
				reduceOnly: 'true',
			},
		];
	}

	private async createMartinGalaOrders(orders, pair): Promise<void> {
		for (const order of orders) {
			console.log('Creating order');
			try {
				await this.binance.createOrder(
					pair,
					this.configuration.mode,
					order.side,
					order.quantity,
					order.price,
					'LIMIT',
					order.reduceOnly,
				);
			} catch (err) {
				this.pendingOrders.push(order);
				console.error(err);
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
		if (orders.length === 0) {
			this.pendingOrders = [];
			return false;
		}

		if (orders.length > 1) {
			// TODO: Maybe this needs to do in main `trade`, and return false so we stop the execution.
			// throw `Trying to set entry order but there are already many orders for ${this.pair}`;
			await this.binance.deleteAllOrders(this.pair, this.mode);
			this.pendingOrders = [];
			return false;
		}

		if (
			orders[0].type === 'LIMIT' &&
			orders[0].side === this.configuration.direction &&
			+orders[0].origQty === amount
		) {
			return true;
		}
		throw 'Unexpected Error';
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
		const open = await this.binance.getCurrentOrders(this.pair, this.mode);
		const profitOrder = open.find((order) => order.type === 'TRAILING_STOP_MARKET');
		if (profitOrder) {
			// Order already in place, check if amount is ok, or remove to create a new one otherwise.
			if (+profitOrder.origQty === +currentPosition.positionAmt) {
				return;
			}
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
						(this.configuration.profitPercentage - this.configuration.profitCallbackPercentage) /
							(100 * this.configuration.leverage));

		await this.binance.createOrder(
			this.pair,
			this.configuration.mode,
			this.configuration.direction === 'BUY' ? 'SELL' : 'BUY',
			currentPosition.positionAmt,
			round(profitPrice, 4),
			'TRAILING_STOP_MARKET',
			'true',
			this.configuration.profitCallbackPercentage,
		);
	}
}
