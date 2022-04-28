import { Binance } from '../../providers/binance';
import { Gafas } from '../../providers/gafas';
import { round } from '../../utils';
import { AbstractStrategy } from './AbstractStrategy';
import { MartinGalaConfiguration } from './types';

export class MartinGala implements AbstractStrategy {
	public configuration: MartinGalaConfiguration;
	private binance = new Binance();
	private gafas = new Gafas();
	private state = {
		lastOperationPrice: 0,
		nextBuyPrice: 0,
		nextSellPrice: 0,
	};

	constructor(configuration: MartinGalaConfiguration) {
		this.configuration = configuration;
	}

	public async init(): Promise<void> {
		const symbol = this.configuration.symbol.split('/')[0];
		const reference = this.configuration.symbol.split('/')[1];
		const pair = `${symbol}${reference}`;

		await this.binance.setIsolatedLeverage(pair, this.configuration.leverage);

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

		const currentPrice = await this.binance.getCurrentPrice(pair, this.configuration.mode);
		const balance = await this.binance.getCurrentBalance(reference, this.configuration.mode);

		const amountToBuy = round(
			(((balance * this.configuration.startSize) / 100) * this.configuration.leverage) /
				currentPrice,
			1,
		);

		// const amountToBuy = 1;

		// TODO: Allow entering without market
		await this.binance.createOrder(
			pair,
			this.configuration.mode,
			this.configuration.direction,
			amountToBuy,
			undefined,
			'MARKET',
		);

		if (!inPlace) {
			console.log('Got things to do:');
			const gafasSetup = await this.gafas.getSetup({
				posicion: this.configuration.direction === 'BUY' ? 'LONG' : 'SHORT',
				recompra: this.configuration.reBuySpacingPercentage,
				monedasx: this.configuration.reBuyAmountPercentage,
				stoploss: this.configuration.stopUsd,
				entrada: currentPrice,
				monedas: amountToBuy,
			});

			const orders = await this.parseGafasSetup(gafasSetup, this.configuration.direction);
			await this.createMartinGalaOrders(orders, pair);
		}

		// TODO: Check when we are in profit, if so, move the takeProfit / stop loss (kind of a trailing stop)

		// TODO: Return only when trade is closed.
		return false;
	}

	private async assertMartinGalaOrdersAreInPlace(pair: string): Promise<boolean> {
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
		const proms = orders.map((order) =>
			this.binance.createOrder(
				pair,
				this.configuration.mode,
				order.side,
				order.quantityUsd,
				order.price,
				'LIMIT',
				order.reduceOnly,
			),
		);

		await Promise.all(proms);
	}
}
