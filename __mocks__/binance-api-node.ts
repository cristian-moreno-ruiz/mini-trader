export const binanceMockSettings = {
	symbol: 'XRPUSDT',
	positionAmt: '13.0',
	price: '0.4100',
	entryPrice: '0.4000',
};

export const binanceMock = {
	futuresAccountBalance: jest.fn(),
	futuresAllOrders: jest.fn().mockResolvedValue([]),
	futuresPrices: jest
		.fn()
		.mockImplementation(() =>
			Promise.resolve({ [binanceMockSettings['symbol']]: binanceMockSettings.price }),
		),
	futuresPositionRisk: jest.fn().mockImplementation(() =>
		Promise.resolve([
			{
				symbol: binanceMockSettings.symbol,
				positionAmt: binanceMockSettings.positionAmt,
				entryPrice: binanceMockSettings.entryPrice,
				markPrice: '0.39540000',
				unRealizedProfit: '0.00000000',
				liquidationPrice: '0.37161365',
				leverage: '15',
				maxNotionalValue: '250000',
				marginType: 'isolated',
				isolatedMargin: '0.34062393',
				isAutoAddMargin: 'false',
				positionSide: 'BOTH',
				notional: '5.14020000',
				isolatedWallet: '0.34062393',
				updateTime: 1654180011349,
			},
		]),
	),
	futuresOrder: jest.fn(),
	futuresLeverage: jest.fn(),
	futuresCancelOrder: jest.fn(),
	futuresCancelAllOpenOrders: jest.fn(),
	futuresExchangeInfo: jest.fn().mockImplementation(() =>
		Promise.resolve({
			symbols: [
				{
					pair: 'XRPUSDT',
					contractType: 'PERPETUAL',
					quantityPrecision: 1,
					filters: [
						{
							minPrice: '0.0143',
							maxPrice: '100000',
							filterType: 'PRICE_FILTER',
							tickSize: '0.0001',
						},
					],
				},
			],
		}),
	),
	futuresIncome: jest.fn(),
};

const mock = jest.fn().mockImplementation(() => {
	return binanceMock;
});

export default mock;
