import { StrategyConfiguration } from '../trading/strategies/types';

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

	// 	startSize: 1,
	// 	direction: 'BUY',
	// 	reBuyAmountPercentage: 40,
	// 	reBuySpacingPercentage: 2,
	// 	stopUsd: 5,
	// },
	// {
	// 	strategy: 'MartinGala',
	// 	mode: 'FUTURES',

	// 	startSize: 1,
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

	// 	startSize: 1,
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

	// 	startSize: 5,
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
	{
		strategy: 'MartinGala',
		mode: 'FUTURES',
		restart: true,

		startSize: 5,
		reBuyAmountPercentage: 40,
		reBuySpacingPercentage: 2,
		stopUsd: 10,
		profitPercentage: 8,
		profitCallbackPercentage: 0.3,

		leverage: 20,
		direction: 'BUY',
		symbol: 'GMT/USDT',

		entry: {
			price: undefined,
			activationPercentage: 0.3,
			callbackPercentage: 0.1,
		},
	},
	{
		strategy: 'MartinGala',
		mode: 'FUTURES',
		restart: true,

		startSize: 5,
		reBuyAmountPercentage: 40,
		reBuySpacingPercentage: 2,
		stopUsd: 10,
		profitPercentage: 8,
		profitCallbackPercentage: 0.2,

		leverage: 15,
		direction: 'SELL',
		symbol: 'ADA/BUSD',
	},
	{
		strategy: 'MartinGala',
		mode: 'FUTURES',
		restart: true,

		startSize: 5,
		reBuyAmountPercentage: 40,
		reBuySpacingPercentage: 2,
		stopUsd: 10,
		profitPercentage: 8,
		profitCallbackPercentage: 0.3,

		leverage: 20,
		direction: 'BUY',
		symbol: 'NEAR/USDT',
	},
	{
		strategy: 'MartinGala',
		mode: 'FUTURES',
		restart: true,

		startSize: 5,
		reBuyAmountPercentage: 40,
		reBuySpacingPercentage: 2,
		stopUsd: 10,
		profitPercentage: 8,
		profitCallbackPercentage: 0.3,

		leverage: 10,
		direction: 'BUY',
		symbol: 'BTC/BUSD',
		entry: {
			price: undefined,
			activationPercentage: 0.2,
			callbackPercentage: 0.1,
		},
	},
	{
		strategy: 'MartinGala',
		mode: 'FUTURES',
		restart: true,

		startSize: 5,
		reBuyAmountPercentage: 40,
		reBuySpacingPercentage: 2,
		stopUsd: 10,
		profitPercentage: 8,
		profitCallbackPercentage: 0.3,

		leverage: 10,
		direction: 'SELL',
		symbol: 'ETH/BUSD',

		entry: {
			price: undefined,
			activationPercentage: 0.2,
			callbackPercentage: 0.1,
		},
	},
];
