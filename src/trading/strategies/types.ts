export type Mode = 'FUTURES' | 'SPOT';

type Strategy = 'BuyLowSellHigh' | 'MartinGala';

export type StrategyConfiguration = BuyLowSellHighConfiguration | MartinGalaConfiguration;

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
	symbol: string;
	leverage: number;

	startSize: number;
	direction: 'BUY' | 'SELL';
	reBuyAmountPercentage: number;
	reBuySpacingPercentage: number;
	stopUsd: number;
}
