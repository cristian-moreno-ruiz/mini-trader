import { Direction, StrategyConfiguration } from '../trading/strategies/types';

export const strategies: StrategyConfiguration[] = [
	// {
	// 	// diffAbsolute: 500, // Price difference (absolute) to consider next move
	// 	buySize: 0.05, // Amount to buy (relative to total available)
	// 	decimalsAmount: 0, // Decimals to use for amount to buy/sell
	// 	decimalsPrice: 4, // Decimals to use for price
	// 	diffAbsolute: 0.005, // Price difference (absolute) to consider next move
	// 	// diff_relative: 0.05, // Price difference (relative) to consider next move
	// 	leverage: 5, // Leverage
	// 	mode: 'FUTURES', // Trading mode (futures or spot)
	// 	sellSize: 0.05, // Amount to sell (relative to position size)
	// 	strategy: 'BuyLowSellHigh', // Strategy to use
	// 	symbol: 'DOGE/BUSD', // Symbol to trade
	// },
	// {
	// 	strategy: 'MartinGala',
	// 	mode: 'FUTURES',
	// 	symbol: 'XRP/BUSD',
	// 	leverage: 15,

	// 	entryPercentage: 1,
	// 	direction: 'BUY',
	// 	reBuyAmountPercentage: 40,
	// 	reBuySpacingPercentage: 2,
	// 	stopUsd: 5,
	// },
	// {
	// 	strategy: 'MartinGala',
	// 	mode: 'FUTURES',

	// 	entryPercentage: 1,
	// 	reBuyAmountPercentage: 40,
	// 	reBuySpacingPercentage: 1.5,
	// 	stopUsd: 5,

	// 	leverage: 15,
	// 	direction: 'BUY',
	// 	symbol: 'GMT/USDT',
	// 	entryPrice: 3.83,
	// },
	// 	{
	// 	strategy: 'MartinGala',
	// 	mode: 'FUTURES',

	// 	entryPercentage: 1,
	// 	reBuyAmountPercentage: 40,
	// 	reBuySpacingPercentage: 1.5,
	// 	stopUsd: 5,
	// 	profitPercentage: 8,
	// 	profitCallbackPercentage: 0.1,

	// 	leverage: 10,
	// 	direction: 'BUY',
	// 	symbol: 'XRP/USDT',
	// 	// entryPrice: 0.6448,
	// },
	// {
	// 	strategy: 'MartinGala',
	// 	mode: 'FUTURES',
	// 	restart: true,

	// 	entryPercentage: 5,
	// 	reBuyAmountPercentage: 40,
	// 	reBuySpacingPercentage: 1.5,
	// 	stopUsd: 5,
	// 	profitPercentage: 12,
	// 	profitCallbackPercentage: 0.1,

	// 	leverage: 10,
	// 	direction: 'BUY',
	// 	symbol: 'APE/USDT',
	// 	// entryPrice: 22.35,
	// },
	// {
	// 	strategy: 'MartinGala',
	// 	mode: 'FUTURES',
	// 	restart: true,

	// 	entryPercentage: 5,
	// 	reBuyAmountPercentage: 40,
	// 	reBuySpacingPercentage: 2,
	// 	stopUsd: 10,
	// 	profitPercentage: 8,
	// 	profitCallbackPercentage: 0.3,

	// 	leverage: 20,
	// 	direction: 'BUY',
	// 	symbol: 'GMT/USDT',

	// 	entry: {
	// 		price: undefined,
	// 		activationPercentage: 0.3,
	// 		callbackPercentage: 0.1,
	// 	},
	// },
	// {
	// 	strategy: 'MartinGala',
	// 	mode: 'FUTURES',
	// 	restart: true,

	// 	entryPercentage: 3,
	// 	reBuyAmountPercentage: 60,
	// 	reBuySpacingPercentage: 2.2,
	// 	stopUsd: 8,
	// 	profitPercentage: 8,
	// 	profitCallbackPercentage: 0.2,

	// 	leverage: 15,
	// 	direction: 'SELL',
	// 	symbol: 'ADA/BUSD',
	// },
	// {
	// 	strategy: 'MartinGala',
	// 	mode: 'FUTURES',
	// 	restart: true,

	// 	entryPercentage: 5,
	// 	reBuyAmountPercentage: 60,
	// 	reBuySpacingPercentage: 2.4,
	// 	stopUsd: 10,
	// 	profitPercentage: 8,
	// 	profitCallbackPercentage: 0.3,

	// 	leverage: 20,
	// 	direction: 'BUY',
	// 	symbol: 'NEAR/USDT',
	// },
	{
		strategy: 'MartinGala',
		mode: 'FUTURES',
		restart: true,

		entrySize: 0.001,
		reBuyAmountPercentage: 60,
		reBuySpacingPercentage: 2.5,
		stopUsd: 50,
		profitPercentage: 7,
		profitCallbackPercentage: 0.3,

		leverage: 15,
		direction: Direction.BUY,
		symbol: 'BTC/USDT',
	},
	{
		strategy: 'MartinGala',
		mode: 'FUTURES',
		restart: true,

		entrySize: 0.004,
		reBuyAmountPercentage: 62,
		reBuySpacingPercentage: 4.3,
		stopUsd: 19,
		profitPercentage: 8,
		profitCallbackPercentage: 0.3,

		leverage: 15,
		direction: Direction.SELL,
		symbol: 'ETH/BUSD',
	},
	// {
	// 	strategy: 'Bollinger',
	// 	mode: 'FUTURES',
	// 	restart: true,

	// 	leverage: 15,
	// 	symbol: 'ETH/USDT',

	// 	entrySize: 0.003,

	// 	interval: '15m',
	// },
	// {
	// 	strategy: 'Custom',
	// 	name: 'BollingerRsiAdx',
	// 	description:
	// 		'Buy Entry Signal (price = bollinger lower band && RSI < 20 && ADX > 32' +
	// 		'Sell Entry Signal (price = bollinger upper band && RSI > 80 && ADX > 32',
	// 	mode: 'FUTURES',
	// 	leverage: 15,
	// 	symbol: 'ETH/USDT',
	// 	interval: '5m',
	// 	entrySize: 0.003,
	// },
	// {
	// 	strategy: 'Custom',
	// 	name: 'DoubleSuperTrend',
	// 	mode: 'FUTURES',
	// 	restart: true,

	// 	leverage: 15,
	// 	direction: Direction.SELL,
	// 	symbol: 'ETH/USDT',

	// 	interval: '5m',
	// },
	// {
	// 	strategy: 'Custom',
	// 	name: 'MacdFlow',
	// 	mode: 'FUTURES',
	// 	restart: true,

	// 	leverage: 15,
	// 	// direction: Direction.SELL,
	// 	symbol: 'ETH/USDT',

	// 	interval: '5m',
	// },
];
