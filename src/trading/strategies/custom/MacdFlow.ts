import { StrategyDefinition } from './types';

export const MacdFlow: StrategyDefinition = {
	description: 'Buy on MACD valley and sell on MACD peak.',
	stages: [
		{
			/**
			 * 1. Fetch Technical analysis data.
			 */
			action: 'fetch',
			input: [
				{
					save: 'macd',
					source: 'taapi',
					data: { indicator: 'macd', params: { backtracks: 20 } },
				},
				{
					save: 'candles',
					source: 'taapi',
					data: { indicator: 'candle', params: { backtracks: 20 } },
				},
			],
		},
		// FIXME: This stage is only for testing purposes.
		{
			actions: [
				{
					// Calculate SL
					action: 'calculate',
					input: [
						{
							save: 'sl',
							data: '+{{currentPosition.entryPrice}} + (+{{currentPosition.positionAmt}} > 0 ? -1 : 1) * ((+{{configuration.stop}}/100) * +{{currentPrice}})',
						},
						// {
						// Calculate TP1
						// },
						// {
						// Calculate TP2
						// },
					],
				},

				{
					// Log SL, TP1 and TP2
					action: 'log',
					input: 'SL: {{sl}}; TP1: {{tp1}}; TP2: {{tp2}}',
				},
			],
		},
		{
			/**
			 * 2. Perform analysis and generate signals.
			 */
			actions: [
				{
					name: 'Logging last 5 MACD',
					action: 'log',
					input:
						'{{macd.4.valueMACDHist}} {{macd.3.valueMACDHist}} {{macd.2.valueMACDHist}} {{macd.1.valueMACDHist}} {{macd.0.valueMACDHist}}',
				},
				{
					/**
					 * BUY Signal Detected.
					 */
					name: 'BUY Signal Detected',
					condition:
						// MACD is below 0 during last 4 periods
						'{{macd.3.valueMACDHist}} < 0 && {{macd.2.valueMACDHist}} < 0 && {{macd.1.valueMACDHist}} < 0 && {{macd.0.valueMACDHist}} < 0' +
						// MACD has done a local min
						'&& {{macd.3.valueMACDHist}} > {{macd.2.valueMACDHist}} && {{macd.2.valueMACDHist}} < {{macd.1.valueMACDHist}} && {{macd.1.valueMACDHist}} < {{macd.0.valueMACDHist}}',
					actions: [
						// Place BUY flag.
						// TODO: Remove in favour of the next one
						{ action: 'fetch', input: { save: 'buy', source: 'local', data: true } },
						{ action: 'fetch', input: { save: 'signal', source: 'local', data: 'BUY' } },
						{ action: 'fetch', input: { save: 'opposite', source: 'local', data: 'SELL' } },
						// Save price at MACD minimum.
						{
							action: 'persist',
							input: { save: 'priceOnLastValley', source: 'local', data: '{{candles.2.low}}' },
						},
					],
				},
				{
					/**
					 * SELL Signal Detected.
					 */
					name: 'SELL Signal Detected',
					condition:
						// MACD is above 0 during last 6 periods
						'{{macd.5.valueMACDHist}} > 0 && {{macd.4.valueMACDHist}} > 0 && {{macd.3.valueMACDHist}} > 0 && {{macd.2.valueMACDHist}} > 0 && {{macd.1.valueMACDHist}} > 0 && {{macd.0.valueMACDHist}} > 0' +
						// MACD has done a local max
						'&& {{macd.3.valueMACDHist}} < {{macd.2.valueMACDHist}} && {{macd.2.valueMACDHist}} > {{macd.1.valueMACDHist}} && {{macd.1.valueMACDHist}} > {{macd.0.valueMACDHist}}',
					actions: [
						// Place SELL flag.
						// TODO: Remove in favour of the next one
						{ action: 'fetch', input: { save: 'sell', source: 'local', data: true } },
						{ action: 'fetch', input: { save: 'signal', source: 'local', data: 'SELL' } },
						{ action: 'fetch', input: { save: 'opposite', source: 'local', data: 'BUY' } },

						// Save price at MACD maximum.
						{
							action: 'persist',
							input: { save: 'priceOnLastPeak', source: 'local', data: '{{candles.2.high}}' },
						},
					],
				},
			],
		},
		{
			/**
			 * 3. If position is open, ensure TPs and SL are set. Also, check if there is a signal to close the position.
			 */
			name: 'Position is open.',
			condition: '+this.builtin.currentPosition.positionAmt !== 0',
			actions: [
				{
					name: 'Processing SELL Signal (exit Long)',
					// TODO: This is not super nice
					condition: '"{{sell}}" == "true" && {{currentPosition.positionAmt}} > 0',
					actions: [
						// Send Notification
						{ action: 'sendNotification', input: 'Closing Long @ {{currentPrice}}' },
						// Close Long position
						{
							action: 'fetch',
							input: {
								source: 'binance',
								data: {
									method: 'createOrder',
									params: ['SELL', '{{configuration.entrySize}}', undefined, 'MARKET', 'true'],
								},
							},
						},
					],
				},
				{
					name: 'Processing BUY Signal (exit Short)',
					// TODO: This is not super nice
					condition: '"{{buy}}" == "true" && {{currentPosition.positionAmt}} < 0',
					actions: [
						// Send Notification
						{ action: 'sendNotification', input: 'Closing Short @ {{currentPrice}}' },
						// Close Long position
						{
							action: 'fetch',
							input: {
								source: 'binance',
								data: {
									method: 'createOrder',
									params: ['BUY', '{{configuration.entrySize}}', undefined, 'MARKET', 'true'],
								},
							},
						},
					],
				},
				// FIXME: This is in progress
				// Ensure TPs and SL are set.
				// {
				// 	action: 'createOrderIfNotExists',
				// 	input: [
				// 	]
				// },
				// * At any time, if MACD goes in the opposite direction, close the position (specially if in profit).
				// 1. Place Stop Loss if not present
				// 2. Place TP1 if not present
				// 3. If TP1 reached, place TP2 if not present, and move SL to entry
				// 4. If TP2 reached, move SL to TP1 (if necessary) and determine if need to exit position
			],
		},
		{
			name: 'Position is not open.',
			condition: '+this.builtin.currentPosition.positionAmt === 0',
			actions: [
				// Remove old orders if any
				{ action: 'fetch', input: { source: 'binance', data: { method: 'deleteAllOrders' } } },
				{
					name: 'Processing SELL Entry Signal',
					condition: '{{sell}}',
					actions: [
						{
							// Send Notification
							action: 'sendNotification',
							input:
								'SELL Entry Signal @ {{currentPrice}} (TP2 is {{priceOnLastValley}}, TP1 is halfway)',
						},
						{
							action: 'fetch',
							input: {
								source: 'binance',
								data: {
									method: 'createOrder',
									params: ['SELL', '{{configuration.entrySize}}', undefined, 'MARKET', 'false'],
								},
							},
						},
						// TODO: Create entry in market
						{
							// TODO: Maybe this is the confirmation that we entered successfully (if not crashed)
							condition: '{{priceOnLastValley}}',
							action: 'sendNotification',
							input: 'We would have entered successfully.',
						},
					],
				},
				{
					name: 'Processing BUY Entry Signal',
					condition: '{{buy}}',
					actions: [
						{
							// Send Notification
							action: 'sendNotification',
							input:
								'BUY Entry Signal @ {{currentPrice}} (TP2 is {{priceOnLastPeak}}, TP1 is halfway)',
						},
						{
							action: 'fetch',
							input: {
								source: 'binance',
								data: {
									method: 'createOrder',
									params: ['BUY', '{{configuration.entrySize}}', undefined, 'MARKET', 'false'],
								},
							},
						},
						// TODO: Create entry in market
						{
							// TODO: Maybe this is the confirmation that we entered successfully (if not crashed)
							condition: '{{priceOnLastPeak}}',
							action: 'sendNotification',
							input: 'We would have entered successfully.',
						},
					],
				},
			],
		},
	],
};
