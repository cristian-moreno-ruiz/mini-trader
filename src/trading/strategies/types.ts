export type Mode = 'FUTURES' | 'SPOT';
export enum Direction {
	BUY = 'BUY',
	SELL = 'SELL',
}

type Strategy = 'BuyLowSellHigh' | 'MartinGala' | 'Bollinger' | 'Custom';

export type StrategyConfiguration =
	| BuyLowSellHighConfiguration
	| MartinGalaConfiguration
	| BollingerConfiguration
	| CustomConfiguration;

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

export interface CustomConfiguration {
	strategy: Strategy;
	name: string;
	mode: Mode;
	leverage: number;
	symbol: string;
	interval: string;
}
