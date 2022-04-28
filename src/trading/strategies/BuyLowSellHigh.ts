import { Binance } from '../../providers/binance';
import { round } from '../../utils';
import { AbstractStrategy } from './AbstractStrategy';
import { BuyLowSellHighConfiguration } from './types';

export class BuyLowSellHigh implements AbstractStrategy {
	public configuration: BuyLowSellHighConfiguration;
	private binance = new Binance();
	private state = {
		lastOperationPrice: 0,
		nextBuyPrice: 0,
		nextSellPrice: 0,
	};

	constructor(configuration: BuyLowSellHighConfiguration) {
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

		const inPlace = await this.assertOrdersInPlace(pair);

		if (!inPlace) {
			console.log('Got things to do:');
			await this.replaceOrdersAndPosition();
		}

		return true;
	}

	private async assertOrdersInPlace(pair: string): Promise<boolean> {
		const currentPrice = await this.binance.getCurrentPrice(pair, this.configuration.mode);
		const orders = await this.binance.getCurrentOrders(pair, this.configuration.mode);
		if (orders.length !== 2) {
			return false;
		}

		const sell = orders.find((order) => order.side === 'SELL' && order.type === 'LIMIT');
		const buy = orders.find((order) => order.side === 'BUY' && order.type === 'LIMIT');

		if (!sell || !buy || sell.price < currentPrice || buy.price > currentPrice) {
			return false;
		}

		return true;
	}

	/**
	 * This function is called to operate, either it buys position and places orders,
	 * or if position exists, it only replace orders.
	 */
	private async replaceOrdersAndPosition(/* pair: string */): Promise<void> {
		const symbol = this.configuration.symbol.split('/')[0];
		const reference = this.configuration.symbol.split('/')[1];
		const pair = `${symbol}${reference}`;

		// Get current position, price and  balance
		const position = +(await this.binance.getCurrentPosition(pair, this.configuration.mode))
			.positionAmt;
		const balance = await this.binance.getCurrentBalance(reference, this.configuration.mode);
		const currentPrice = await this.binance.getCurrentPrice(pair, this.configuration.mode);
		this.state.lastOperationPrice = currentPrice;

		// Cancel current open orders, if any, we will replace them later.
		await this.binance.deleteAllOrders(pair, this.configuration.mode);

		// TODO: If no position, buy something at market price, and store operation price.
		if (position === 0) {
			// If position is currently empty, buy the initial amount.
			console.log(`Position of ${pair} is 0`);
			const balance = await this.binance.getCurrentBalance(reference, this.configuration.mode);

			const amountToBuy = round(
				(balance * this.configuration.buySize * this.configuration.leverage) / currentPrice,
				this.configuration.decimalsAmount,
			);

			await this.binance.createOrder(
				pair,
				this.configuration.mode,
				'BUY',
				amountToBuy,
				undefined,
				'MARKET',
			);
		}
		// TODO: In the future, if current price is below the entry position, we could try to promediate?? -> This maybe fits more in MartinGala though

		// Calculate where to sell/buy and amounts to sell/buy, based on configuration
		const whereToSell = round(
			currentPrice + this.configuration.diffAbsolute,
			this.configuration.decimalsPrice,
		);
		const whereToBuy = round(
			currentPrice - this.configuration.diffAbsolute,
			this.configuration.decimalsPrice,
		);

		const amountToSell = round((position * this.configuration.sellSize) / currentPrice, 0);
		const amountToBuy = round(
			(balance * this.configuration.buySize * this.configuration.leverage) / currentPrice,
			0,
		);

		console.log(`Creating ${pair} sell order for ${amountToSell} at ${whereToSell}`);
		console.log(`Creating ${pair} buy order for ${amountToBuy} at ${whereToBuy}`);

		await this.binance.createOrder(
			pair,
			this.configuration.mode,
			'SELL',
			amountToSell,
			whereToSell,
		);
		await this.binance.createOrder(pair, this.configuration.mode, 'BUY', amountToBuy, whereToBuy);
	}
}
