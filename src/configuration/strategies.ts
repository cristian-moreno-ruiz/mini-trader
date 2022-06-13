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
	// {
	// 	strategy: 'MartinGala',
	// 	mode: 'FUTURES',
	// 	restart: true,
	// 	entrySize: 0.004,
	// 	reBuyAmountPercentage: 62,
	// 	reBuySpacingPercentage: 4.3,
	// 	stopUsd: 19,
	// 	profitPercentage: 8,
	// 	profitCallbackPercentage: 0.3,
	// 	leverage: 15,
	// 	direction: Direction.SELL,
	// 	symbol: 'ETH/BUSD',
	// },
	{
		strategy: 'Custom',
		name: 'MacdHistogram',
		mode: 'FUTURES',
		leverage: 15,
		symbol: 'ETH/USDT',
		entrySize: 0.006,
		entryCrossover: 0,
		exitCrossover: 0,
		stop: 2,
		// reEntries: {
		// 	percentageSize: 100,
		// 	maxPosition: 0.009,
		// },
		// profit: 1,
		interval: '15m',
	},
	{
		strategy: 'Custom',
		name: 'MacdHistogram',
		mode: 'FUTURES',
		leverage: 15,
		symbol: 'LTC/USDT',
		entrySize: 0.13,
		entryCrossover: false,
		exitCrossover: false,
		stop: 2,
		// profit: 1,
		interval: '15m',
	},
	{
		// BTC could be in-between, not so permissive as LTC but easier exit/entry than ETH
		strategy: 'Custom',
		name: 'MacdHistogram',
		mode: 'FUTURES',
		leverage: 30,
		symbol: 'BTC/USDT',
		entrySize: 0.001,
		entryCrossover: -10,
		exitCrossover: -10,
		stop: 2,
		// reEntries: {
		// 	percentageSize: 100,
		// 	maxPosition: 0.009,
		// },
		// profit: 1,
		interval: '30m',
	},
	{
		strategy: 'Custom',
		name: 'MacdHistogram',
		mode: 'FUTURES',
		leverage: 15,
		symbol: 'XMR/USDT',
		entrySize: 0.05,
		entryCrossover: 0.15,
		exitCrossover: 0,
		stop: 2,
		// profit: 1,
		interval: '15m',
	},
	// {
	// 	strategy: 'Custom',
	// 	name: 'MacdHistogram',
	// 	mode: 'FUTURES',
	// 	leverage: 15,
	// 	symbol: 'XRP/USDT',
	// 	entrySize: 13,
	// 	// stop: 0.5,
	// 	// profit: 1,
	// 	entryCrossover: false,
	// 	exitCrossover: false,
	// 	interval: '15m',
	// 	// reEntries: {
	// 	// 	percentageSize: 100,
	// 	// 	maxPosition: 0.01,
	// 	// },
	// },
];
