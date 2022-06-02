import { Custom } from '../CustomStrategy';
import { MacdFlowConfiguration } from '../types';
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

describe('MacdFlow', () => {
	let engine: Custom;

	describe('Trade with minimum configuration', () => {
		beforeEach(() => {
			jest.clearAllMocks();

			const strategy = {
				strategy: 'Custom',
				name: 'MacdFlow',
				mode: 'FUTURES',
				leverage: 15,
				symbol: 'XRP/USDT',
				entrySize: 13,
				entryCrossover: false,
				exitCrossover: false,
				interval: '1m',
			} as MacdFlowConfiguration;

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

	describe('Trade with all available features enabled', () => {
		beforeEach(() => {
			const strategy = {
				strategy: 'Custom',
				name: 'MacdFlow',
				mode: 'FUTURES',
				leverage: 15,
				symbol: 'XRP/USDT',
				entrySize: 13,
				entryCrossover: 0,
				exitCrossover: 0,
				interval: '1m',
				stop: 0.5,
				profit: 1,
				reEntries: {
					percentageSize: 100,
					maxPosition: 30,
				},
			} as MacdFlowConfiguration;

			engine = new Custom(strategy);
		});
	});
});
