import { Direction, StrategyConfiguration } from '../trading/strategies/types';

export const strategies: StrategyConfiguration[] = [
	// {
	// 	strategy: 'MartinGala',
	// 	mode: 'FUTURES',
	// 	restart: true,

	// 	entrySize: 0.001,
	// 	reBuyAmountPercentage: 60,
	// 	reBuySpacingPercentage: 2.5,
	// 	stopUsd: 50,
	// 	profitPercentage: 7,
	// 	profitCallbackPercentage: 0.3,

	// 	leverage: 15,
	// 	direction: Direction.BUY,
	// 	symbol: 'BTC/BUSD',
	// },
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
	{
		strategy: 'Custom',
		name: 'MacdFlow',
		mode: 'FUTURES',
		restart: true,

		leverage: 15,
		symbol: 'ETH/USDT',
		entrySize: 0.003,

		stop: 0.5,
		profit: 1,

		interval: '5m',
	},
];
