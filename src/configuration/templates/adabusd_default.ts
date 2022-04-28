export const configuration = {
	// diffAbsolute: 500, // Price difference (absolute) to consider next move
	buySize: 0.05, // Amount to buy (relative to total available)
	decimalsAmount: 0, // Decimals to use for amount to buy/sell
	decimalsPrice: 4, // Decimals to use for price
	diffAbsolute: 0.005, // Price difference (absolute) to consider next move
	// diff_relative: 0.05, // Price difference (relative) to consider next move
	leverage: 5, // Leverage
	mode: 'FUTURES', // Trading mode (futures or spot)
	sellSize: 0.25, // Amount to sell (relative to position size)
	strategy: 'BuyLowSellHigh', // Strategy to use
	symbol: 'ADA/BUSD', // Symbol to trade
	tick: 30, // Time between executions
};
