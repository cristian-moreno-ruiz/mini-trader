import { Custom } from '../CustomStrategy';
import { MacdHistogramConfiguration } from '../types';
import { binanceMockSettings, binanceMock } from '../../../../__mocks__/binance-api-node';
import { taapiMockSettings } from '../../../../__mocks__/taapi';
import short, { SUUID } from 'short-uuid';

short.generate = () => 'abc1234' as SUUID;

// Time travel each time we request for Date.now(), to avoid taapi rate limiting.
let lastDate = Date.now();
Date.now = jest.fn().mockImplementation(() => {
	lastDate += 20000;
	return lastDate;
});

describe('MacdHistogram', () => {
	let engine: Custom;

	beforeEach(() => {
		jest.clearAllMocks();
		binanceMockSettings.reset();
	});

	describe('Trade with minimum configuration', () => {
		beforeEach(() => {
			const strategy = {
				strategy: 'Custom',
				name: 'MacdHistogram',
				mode: 'FUTURES',
				leverage: 15,
				symbol: 'XRP/USDT',
				entrySize: 13,
				entryCrossover: false,
				exitCrossover: false,
				interval: '1m',
			} as MacdHistogramConfiguration;

			engine = new Custom(strategy);
		});

		it('should not enter a position if we don"t have any peak nor valley', async () => {
			binanceMockSettings.positionAmt = '0';
			taapiMockSettings.macd = [
				{ valueMACDHist: 0 },
				{ valueMACDHist: 0 },
				{ valueMACDHist: 0 },
				{ valueMACDHist: 0 },
			];

			await engine.trade();

			expect(binanceMock.futuresOrder).not.toHaveBeenCalled();
		});

		it('should enter a LONG position if we detect a valley', async () => {
			binanceMockSettings.positionAmt = '0';
			taapiMockSettings.macd = [
				{ valueMACDHist: 0 },
				{ valueMACDHist: -0.05 },
				{ valueMACDHist: -0.1 },
				{ valueMACDHist: 0 },
			];

			await engine.trade();

			expect(binanceMock.futuresOrder).toHaveBeenCalledTimes(1);
			expect(binanceMock.futuresOrder.mock.calls[0]).toMatchInlineSnapshot(`
			Array [
			  Object {
			    "newClientOrderId": "MINI_TRADER:abc1234",
			    "quantity": "13",
			    "reduceOnly": "false",
			    "side": "BUY",
			    "symbol": "XRPUSDT",
			    "type": "MARKET",
			  },
			]
		`);
		});

		it('should enter a SHORT position if we detect a peak', async () => {
			binanceMockSettings.positionAmt = '0';
			taapiMockSettings.macd = [
				{ valueMACDHist: 0 },
				{ valueMACDHist: 0.05 },
				{ valueMACDHist: 0.1 },
				{ valueMACDHist: 0 },
			];

			await engine.trade();

			expect(binanceMock.futuresOrder).toHaveBeenCalledTimes(1);
			expect(binanceMock.futuresOrder.mock.calls[0]).toMatchInlineSnapshot(`
			Array [
			  Object {
			    "newClientOrderId": "MINI_TRADER:abc1234",
			    "quantity": "13",
			    "reduceOnly": "false",
			    "side": "SELL",
			    "symbol": "XRPUSDT",
			    "type": "MARKET",
			  },
			]
		`);
		});

		it('should exit a LONG position if we detect a peak', async () => {
			binanceMockSettings.positionAmt = '13';
			taapiMockSettings.macd = [
				{ valueMACDHist: 0 },
				{ valueMACDHist: 0.05 },
				{ valueMACDHist: 0.1 },
				{ valueMACDHist: 0 },
			];

			await engine.trade();

			expect(binanceMock.futuresOrder).toHaveBeenCalledTimes(1);
			expect(binanceMock.futuresOrder.mock.calls[0]).toMatchInlineSnapshot(`
			Array [
			  Object {
			    "newClientOrderId": "MINI_TRADER:abc1234",
			    "quantity": "13",
			    "reduceOnly": "true",
			    "side": "SELL",
			    "symbol": "XRPUSDT",
			    "type": "MARKET",
			  },
			]
		`);
		});

		it('should exit a SHORT position if we detect a valley', async () => {
			binanceMockSettings.positionAmt = '-13';
			taapiMockSettings.macd = [
				{ valueMACDHist: 0 },
				{ valueMACDHist: -0.05 },
				{ valueMACDHist: -0.1 },
				{ valueMACDHist: 0 },
			];

			await engine.trade();

			expect(binanceMock.futuresOrder).toHaveBeenCalledTimes(1);
			expect(binanceMock.futuresOrder.mock.calls[0]).toMatchInlineSnapshot(`
			Array [
			  Object {
			    "newClientOrderId": "MINI_TRADER:abc1234",
			    "quantity": "13",
			    "reduceOnly": "true",
			    "side": "BUY",
			    "symbol": "XRPUSDT",
			    "type": "MARKET",
			  },
			]
		`);
		});
	});

	describe('Trade with crossover enabled', () => {
		beforeEach(() => {
			const strategy = {
				strategy: 'Custom',
				name: 'MacdHistogram',
				mode: 'FUTURES',
				leverage: 15,
				symbol: 'XRP/USDT',
				entrySize: 13,
				entryCrossover: 1,
				exitCrossover: 1,
				interval: '1m',
				// stop: 0.5,
				// profit: 1,
				// reEntries: {
				// 	percentageSize: 100,
				// 	maxPosition: 30,
				// },
			} as MacdHistogramConfiguration;

			engine = new Custom(strategy);
		});

		it('should not enter a LONG position if the valley doesn"t cross below the -entryCrossover: -1', async () => {
			binanceMockSettings.positionAmt = '0';
			taapiMockSettings.macd = [
				{ valueMACDHist: 0 },
				{ valueMACDHist: -0.1 },
				{ valueMACDHist: -0.5 },
				{ valueMACDHist: 0.5 },
			];

			await engine.trade();

			expect(binanceMock.futuresOrder).not.toHaveBeenCalled();
		});

		it('should not enter a SHORT position if the peak doesn"t cross above the +entryCrossover: +1', async () => {
			binanceMockSettings.positionAmt = '0';
			taapiMockSettings.macd = [
				{ valueMACDHist: 0 },
				{ valueMACDHist: 0.1 },
				{ valueMACDHist: 0.5 },
				{ valueMACDHist: -0.5 },
			];

			await engine.trade();

			expect(binanceMock.futuresOrder).not.toHaveBeenCalled();
		});

		it('should enter a LONG position if the valley crosses below the -entryCrossover: -1', async () => {
			binanceMockSettings.positionAmt = '0';
			taapiMockSettings.macd = [
				{ valueMACDHist: -0.5 },
				{ valueMACDHist: -0.9 },
				{ valueMACDHist: -1.5 },
				{ valueMACDHist: -0.8 },
			];

			await engine.trade();

			expect(binanceMock.futuresOrder).toHaveBeenCalled();
			expect(binanceMock.futuresOrder.mock.calls[0]).toMatchInlineSnapshot(`
			Array [
			  Object {
			    "newClientOrderId": "MINI_TRADER:abc1234",
			    "quantity": "13",
			    "reduceOnly": "false",
			    "side": "BUY",
			    "symbol": "XRPUSDT",
			    "type": "MARKET",
			  },
			]
		`);
		});

		it('should enter a SHORT position if the peak crosses above the entryCrossover', async () => {
			binanceMockSettings.positionAmt = '0';
			taapiMockSettings.macd = [
				{ valueMACDHist: 0.8 },
				{ valueMACDHist: 0.9 },
				{ valueMACDHist: 1.5 },
				{ valueMACDHist: 0.5 },
			];

			await engine.trade();

			expect(binanceMock.futuresOrder).toHaveBeenCalled();
			expect(binanceMock.futuresOrder.mock.calls[0]).toMatchInlineSnapshot(`
			Array [
			  Object {
			    "newClientOrderId": "MINI_TRADER:abc1234",
			    "quantity": "13",
			    "reduceOnly": "false",
			    "side": "SELL",
			    "symbol": "XRPUSDT",
			    "type": "MARKET",
			  },
			]
		`);
		});

		it('should not exit a SHORT position if the valley doesn"t cross below the -exitCrossover: -1', async () => {
			binanceMockSettings.positionAmt = '-13';
			taapiMockSettings.macd = [
				{ valueMACDHist: 0 },
				{ valueMACDHist: -0.1 },
				{ valueMACDHist: -0.5 },
				{ valueMACDHist: 0.5 },
			];

			await engine.trade();

			expect(binanceMock.futuresOrder).not.toHaveBeenCalled();
		});

		it('should not exit a LONG position if the peak doesn"t cross above the +entryCrossover: +1', async () => {
			binanceMockSettings.positionAmt = '13';
			taapiMockSettings.macd = [
				{ valueMACDHist: 0 },
				{ valueMACDHist: 0.1 },
				{ valueMACDHist: 0.5 },
				{ valueMACDHist: -0.5 },
			];

			await engine.trade();

			expect(binanceMock.futuresOrder).not.toHaveBeenCalled();
		});

		it('should exit a SHORT position if the valley crosses below the -entryCrossover: -1', async () => {
			binanceMockSettings.positionAmt = '-13';
			taapiMockSettings.macd = [
				{ valueMACDHist: -0.5 },
				{ valueMACDHist: -0.9 },
				{ valueMACDHist: -1.5 },
				{ valueMACDHist: -0.8 },
			];

			await engine.trade();

			expect(binanceMock.futuresOrder).toHaveBeenCalled();
			expect(binanceMock.futuresOrder.mock.calls[0]).toMatchInlineSnapshot(`
			Array [
			  Object {
			    "newClientOrderId": "MINI_TRADER:abc1234",
			    "quantity": "13",
			    "reduceOnly": "true",
			    "side": "BUY",
			    "symbol": "XRPUSDT",
			    "type": "MARKET",
			  },
			]
		`);
		});

		it('should exit a LONG position if the peak crosses above the entryCrossover', async () => {
			binanceMockSettings.positionAmt = '13';
			taapiMockSettings.macd = [
				{ valueMACDHist: 0.8 },
				{ valueMACDHist: 0.9 },
				{ valueMACDHist: 1.5 },
				{ valueMACDHist: 0.5 },
			];

			await engine.trade();

			expect(binanceMock.futuresOrder).toHaveBeenCalled();
			expect(binanceMock.futuresOrder.mock.calls[0]).toMatchInlineSnapshot(`
			Array [
			  Object {
			    "newClientOrderId": "MINI_TRADER:abc1234",
			    "quantity": "13",
			    "reduceOnly": "true",
			    "side": "SELL",
			    "symbol": "XRPUSDT",
			    "type": "MARKET",
			  },
			]
		`);
		});
	});

	describe('Trade with Stop and Profit enabled', () => {
		beforeEach(() => {
			const strategy = {
				strategy: 'Custom',
				name: 'MacdHistogram',
				mode: 'FUTURES',
				leverage: 15,
				symbol: 'XRP/USDT',
				entrySize: 13,
				entryCrossover: false,
				exitCrossover: false,
				interval: '1m',
				stop: 0.5,
				profit: 1,
				// reEntries: {
				// 	percentageSize: 100,
				// 	maxPosition: 30,
				// },
			} as MacdHistogramConfiguration;

			engine = new Custom(strategy);
		});
	});

	describe('Should Trade with Stop, Profit and Re-Entries enabled', () => {
		beforeEach(() => {
			const strategy = {
				strategy: 'Custom',
				name: 'MacdHistogram',
				mode: 'FUTURES',
				leverage: 15,
				symbol: 'XRP/USDT',
				entrySize: 13,
				entryCrossover: false,
				exitCrossover: false,
				interval: '1m',
				stop: 0.5,
				profit: 1,
				reEntries: {
					percentageSize: 100,
					maxPosition: 30,
					interval: 1,
				},
			} as MacdHistogramConfiguration;

			engine = new Custom(strategy);
		});

		it('should re-enter a LONG position if a valley occurs', async () => {
			binanceMockSettings.positionAmt = '13';
			taapiMockSettings.macd = [
				{ valueMACDHist: -0.5 },
				{ valueMACDHist: -0.9 },
				{ valueMACDHist: -1.5 },
				{ valueMACDHist: -0.8 },
			];

			await engine.trade();

			// All previous orders should be cancelled
			expect(binanceMock.futuresCancelAllOpenOrders).toHaveBeenCalledTimes(1);

			// Should create market and stop orders (TODO: and profit)
			expect(binanceMock.futuresOrder).toHaveBeenCalledTimes(2);
			expect(binanceMock.futuresOrder.mock.calls).toMatchInlineSnapshot(`
			Array [
			  Array [
			    Object {
			      "newClientOrderId": "MINI_TRADER:abc1234",
			      "quantity": "13",
			      "reduceOnly": "false",
			      "side": "BUY",
			      "symbol": "XRPUSDT",
			      "type": "MARKET",
			    },
			  ],
			  Array [
			    Object {
			      "newClientOrderId": "MINI_TRADER:abc1234",
			      "quantity": "13",
			      "reduceOnly": "true",
			      "side": "SELL",
			      "stopPrice": "0.398",
			      "symbol": "XRPUSDT",
			      "type": "STOP_MARKET",
			    },
			  ],
			]
		`);
		});

		// This is to ensure we only re-enter once every peak/valley.
		it('should not re-enter twice in the same candle, using interval setting', async () => {
			binanceMockSettings.positionUpdateTime = new Date().getTime();
			binanceMockSettings.positionAmt = '13';
			taapiMockSettings.macd = [
				{ valueMACDHist: -0.5 },
				{ valueMACDHist: -0.9 },
				{ valueMACDHist: -1.5 },
				{ valueMACDHist: -0.8 },
			];

			await engine.trade();

			expect(binanceMock.futuresCancelAllOpenOrders).not.toHaveBeenCalled();
			// Only called to ensure stop is in place
			expect(binanceMock.futuresOrder).toHaveBeenCalledTimes(1);
		});

		it('should re-enter a LONG position if a valley occurs, with remaining allowed size', async () => {
			binanceMockSettings.positionAmt = '26';
			taapiMockSettings.macd = [
				{ valueMACDHist: -0.5 },
				{ valueMACDHist: -0.9 },
				{ valueMACDHist: -1.5 },
				{ valueMACDHist: -0.8 },
			];

			await engine.trade();

			// All previous orders should be cancelled
			expect(binanceMock.futuresCancelAllOpenOrders).toHaveBeenCalledTimes(1);

			// Should create market and stop orders (TODO: and profit)
			expect(binanceMock.futuresOrder).toHaveBeenCalledTimes(2);
			expect(binanceMock.futuresOrder.mock.calls[0]).toMatchInlineSnapshot(`
			Array [
			  Object {
			    "newClientOrderId": "MINI_TRADER:abc1234",
			    "quantity": "4",
			    "reduceOnly": "false",
			    "side": "BUY",
			    "symbol": "XRPUSDT",
			    "type": "MARKET",
			  },
			]
		`);
		});

		it('should not re-enter a LONG position when maxSize is reached', async () => {
			binanceMockSettings.positionAmt = '30';
			taapiMockSettings.macd = [
				{ valueMACDHist: -0.5 },
				{ valueMACDHist: -0.9 },
				{ valueMACDHist: -1.5 },
				{ valueMACDHist: -0.8 },
			];

			await engine.trade();

			expect(binanceMock.futuresCancelAllOpenOrders).not.toHaveBeenCalled();
			// Only called to ensure stop is in place
			expect(binanceMock.futuresOrder).toHaveBeenCalledTimes(1);
		});

		it('should re-enter a SHORT position if a peak occurs', async () => {
			binanceMockSettings.positionAmt = '-13';
			taapiMockSettings.macd = [
				{ valueMACDHist: 0.8 },
				{ valueMACDHist: 0.9 },
				{ valueMACDHist: 1.5 },
				{ valueMACDHist: 0.5 },
			];

			await engine.trade();

			// All previous orders should be cancelled
			expect(binanceMock.futuresCancelAllOpenOrders).toHaveBeenCalledTimes(1);

			// Should create market and stop orders (TODO: and profit)
			expect(binanceMock.futuresOrder).toHaveBeenCalledTimes(2);
			expect(binanceMock.futuresOrder.mock.calls).toMatchInlineSnapshot(`
			Array [
			  Array [
			    Object {
			      "newClientOrderId": "MINI_TRADER:abc1234",
			      "quantity": "13",
			      "reduceOnly": "false",
			      "side": "SELL",
			      "symbol": "XRPUSDT",
			      "type": "MARKET",
			    },
			  ],
			  Array [
			    Object {
			      "newClientOrderId": "MINI_TRADER:abc1234",
			      "quantity": "13",
			      "reduceOnly": "true",
			      "side": "BUY",
			      "stopPrice": "0.402",
			      "symbol": "XRPUSDT",
			      "type": "STOP_MARKET",
			    },
			  ],
			]
		`);
		});

		it('should re-enter a SHORT position if a peak occurs, with remaining allowed size', async () => {
			binanceMockSettings.positionAmt = '-13';
			taapiMockSettings.macd = [
				{ valueMACDHist: 0.8 },
				{ valueMACDHist: 0.9 },
				{ valueMACDHist: 1.5 },
				{ valueMACDHist: 0.5 },
			];

			await engine.trade();

			// All previous orders should be cancelled
			expect(binanceMock.futuresCancelAllOpenOrders).toHaveBeenCalledTimes(1);

			// Should create market and stop orders (TODO: and profit)
			expect(binanceMock.futuresOrder).toHaveBeenCalledTimes(2);
			expect(binanceMock.futuresOrder.mock.calls[0]).toMatchInlineSnapshot(`
			Array [
			  Object {
			    "newClientOrderId": "MINI_TRADER:abc1234",
			    "quantity": "13",
			    "reduceOnly": "false",
			    "side": "SELL",
			    "symbol": "XRPUSDT",
			    "type": "MARKET",
			  },
			]
		`);
		});

		it('should not re-enter a SHORT position when maxSize is reached', async () => {
			binanceMockSettings.positionAmt = '-30';
			taapiMockSettings.macd = [
				{ valueMACDHist: 0.8 },
				{ valueMACDHist: 0.9 },
				{ valueMACDHist: 1.5 },
				{ valueMACDHist: 0.5 },
			];

			await engine.trade();

			// Only called to ensure stop is in place
			expect(binanceMock.futuresOrder).toHaveBeenCalledTimes(1);
		});
	});
});
