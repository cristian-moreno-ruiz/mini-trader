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
	private state = {
		lastOperationPrice: 0,
		nextBuyPrice: 0,
		nextSellPrice: 0,
	};

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

		const inPlace = await this.assertMartinGalaOrdersAreInPlace(pair);
		const isOpen = await this.checkPositionIsOpen();
		const currentPrice = await this.binance.getCurrentPrice(pair, this.mode);
		const entrySize = await this.calculateEntryPrice(currentPrice);

		if (!isOpen) {
			if (this.configuration.entryPrice) {
				const entryInPlace = await this.checkEntryOrderExists(entrySize);

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

			return true;
		}

		// From this point on, we can be sure we have an open position.

		if (!inPlace) {
			console.log('Got things to do:');

			// TODO: Slowly put orders in place.
			// 1. Call gafas setup
			// 2. Save orders needed in variable
			// 3. Check current orders
			// 4. Remove in-place orders from variable
			// 5. Try to place next order

			const gafasSetup = await this.gafas.getSetup({
				posicion: this.configuration.direction === 'BUY' ? 'LONG' : 'SHORT',
				recompra: this.configuration.reBuySpacingPercentage,
				monedasx: this.configuration.reBuyAmountPercentage,
				stoploss: this.configuration.stopUsd,
				entrada: currentPrice,
				monedas: entrySize,
			});

			const orders = await this.parseGafasSetup(gafasSetup, this.configuration.direction);
			await this.createMartinGalaOrders(orders, pair);
		}

		// TODO: Check when we are in profit, if so, move the takeProfit / stop loss (kind of a trailing stop)

		// TODO: Return only when trade is closed.
		return false;
	}

	private async assertMartinGalaOrdersAreInPlace(_pair: string): Promise<boolean> {
		return false;
	}

	private parseGafasSetup(gafasSetup: any, side: string) {
		// gafasSetup = [
		// 	{ numero: '1', precio: '0.98', monedas: '5.6', usdt: '5.49' },
		// 	{ numero: '2', precio: '0.96', monedas: '7.84', usdt: '7.53' },
		// 	{ numero: '3', precio: '0.94', monedas: '10.976', usdt: '10.32' },
		// 	{ numero: '4', precio: '0.92', monedas: '15.366', usdt: '14.14' },
		// 	{ numero: '5', precio: '0.9', monedas: '21.512', usdt: '19.36' },
		// 	{ numero: '6', precio: '0.88', monedas: '30.117', usdt: '26.5' },
		// 	{ numero: '7', precio: '0.86', monedas: '42.164', usdt: '36.26' },
		// 	{ numero: '8', precio: '0.84', monedas: '59.03', usdt: '49.59' },
		// 	{ numero: 'SL(-37%)', precio: '0.63', monedas: '196.605', usdt: '173.18' },
		// ];

		const reBuys = gafasSetup
			.filter((order) => order.numero.indexOf('SL') === -1)
			.map((order) => ({
				// TODO: Get round from config
				price: round(+order.precio, 4),
				// TODO: Get round from config
				quantityUsd: round(+order.usdt, 0),
				side: side === 'BUY' ? 'BUY' : 'SELL',
				reduceOnly: 'false',
			}));

		const stop = gafasSetup.find((order) => order.numero.indexOf('SL') !== -1);

		return [
			...reBuys,
			{
				// TODO: Get round from config
				price: round(+stop.precio, 4),
				// TODO: Get round from config
				quantityUsd: round(+stop.monedas, 0),
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
					order.quantityUsd,
					order.price,
					'LIMIT',
					order.reduceOnly,
				);
			}
		} 
		// const proms = orders.map((order) =>
		// 	this.binance.createOrder(
		// 		pair,
		// 		this.configuration.mode,
		// 		order.side,
		// 		order.quantityUsd,
		// 		order.price,
		// 		'LIMIT',
		// 		order.reduceOnly,
		// 	),
		// // );



		// await Promise.all(proms);
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
			return false;
		}

		if (orders.length > 1) {
			// TODO: Maybe this needs to do in main `trade`, and return false so we stop the execution.
			throw `Trying to set entry order but there are already many orders for ${this.pair}`;
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

	private async calculateEntryPrice(currentPrice: number) {
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
}
