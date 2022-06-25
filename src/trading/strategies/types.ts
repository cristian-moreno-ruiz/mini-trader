export type Mode = 'FUTURES' | 'SPOT';
export enum Direction {
	BUY = 'BUY',
	SELL = 'SELL',
}

type Strategy = 'BuyLowSellHigh' | 'MartinGala' | 'Bollinger' | 'Custom' | 'Signals';

export type StrategyConfiguration =
	| BuyLowSellHighConfiguration
	| MartinGalaConfiguration
	| BollingerConfiguration
	| CustomConfiguration
	| SignalsConfiguration;

export interface BuyLowSellHighConfiguration {
	// diffAbsolute: 500, // Price difference (absolute) to consider next move
	buySize: number; // Amount to buy (relative to total available)
	decimalsAmount: number; // Decimals to use for amount to buy/sell
	decimalsPrice: number; // Decimals to use for price
	diffAbsolute: number; // Price difference (absolute) to consider next move
	// diff_relative: 0.05, // Price difference (relative) to consider next move
	leverage: number; // Leverage
	mode: Mode; // Trading mode (futures or spot)
	sellSize: number; // Amount to sell (relative to position size)
	strategy: Strategy; // Strategy to use
	symbol: string; // Symbol to trade
}

export interface MartinGalaConfiguration {
	strategy: Strategy;
	mode: Mode;
	restart?: boolean;

	symbol: string;
	leverage: number;
	profitPercentage: number;
	profitCallbackPercentage: number;

	entrySize?: number;
	entryPercentage?: number;
	direction: Direction;
	reBuyAmountPercentage: number;
	reBuySpacingPercentage: number;
	stopUsd: number;

	entry?: {
		price?: number;
		activationPercentage?: number;
		callbackPercentage?: number;
	};
}

// TODO: Deprecate this one in favour of custom
export interface BollingerConfiguration {
	strategy: Strategy;
	mode: Mode;
	restart?: boolean;
	name: 'Bollinger';

	symbol: string;
	leverage: number;

	entrySize: number;

	interval:
		| '1m'
		| '5m'
		| '15m'
		| '30m'
		| '1h'
		| '2h'
		| '4h'
		| '6h'
		| '8h'
		| '12h'
		| '1d'
		| '3d'
		| '1w'
		| '1M';
}

// export interface CustomConfiguration {
// 	strategy: Strategy;
// 	name: string;
// 	mode: Mode;
// 	leverage: number;
// 	symbol: string;
// 	interval: string;
// 	stop: number;
// 	profit: number;
// }

export type CustomConfiguration = MacdHistogramConfiguration;

export interface MacdHistogramConfiguration {
	strategy: Strategy;
	name: 'MacdHistogram';
	mode: Mode;
	leverage: number;
	/**
	 * The symbol to trade. E.g: 'BTC/USDT'.
	 */
	symbol: string;
	/**
	 * Interval to perform the analysis on, and search for entries.
	 */
	interval: string;
	/**
	 * Stop Loss percentage (no leverage taken into account).
	 */
	stop?: number;
	/**
	 * Profit percentage for TP1 (no leverage taken into account).
	 */
	profit?: number;
	/**
	 * Break Even: When this price is reached, place stop loss at entry price.
	 */
	be?: number;
	/**
	 * The size of a single entry.
	 */
	entrySize: number;

	/**
	 * In order to be considered as an entry signal, the price must cross over this value (for a SELL) or fall below the
	 * opposite (-entryCrossover) (for a BUY). Negative crossover is more easy to happen than positive crossover.
	 */
	entryCrossover: number | false;
	/**
	 * In order to be considered as an exit signal, the price must cross over this value (for a SELL) or fall below the
	 * opposite (-exitCrossover) (for a BUY). Negative crossover is more easy to happen than positive crossover.
	 */
	exitCrossover: number | false;
	/**
	 * If a signal in the same direction triggers again, allow a new entry (increase the position).
	 */
	reEntries?: {
		/**
		 * Percentage of the current position to be added.
		 */
		percentageSize: number;
		/**
		 * Allow re-entries up to this position size.
		 */
		maxPosition: number;
		/**
		 * Min time (minutes) between re-entries to avoid re-entering in same candle.
		 */
		interval: number;
	};
}

export interface SignalsConfiguration {
	strategy: 'Signals';
	symbol: string;
	dialog: string;
	percentageSize: number;
}
