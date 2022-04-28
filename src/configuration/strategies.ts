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
	{
		strategy: 'MartinGala',
		mode: 'FUTURES',
		symbol: 'GMT/USDT',
		leverage: 15,
	
		startSize: 1,
		direction: 'BUY',
		reBuyAmountPercentage: 40,
		reBuySpacingPercentage: 2,
		stopUsd: 5,
	},
];
