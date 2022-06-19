import { StrategyDefinition } from './types';

export const MacdHistogram: StrategyDefinition = {
	description: 'Buy on MACD valley and sell on MACD peak.',
	stages: [
		{
			/**
			 * 1. Fetch Technical analysis data.
			 */
			action: 'fetch',
			input: [
				{ save: 'macd', source: 'taapi', data: { indicator: 'macd', params: { backtracks: 20 } } },
				{
					save: 'candles',
					source: 'taapi',
					data: { indicator: 'candle', params: { backtracks: 20 } },
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
					 * Potential BUY (Valley) Detected.
					 */
					name: 'Valley Detected',
					condition:
						'{{macd.3.valueMACDHist}} > {{macd.2.valueMACDHist}} && {{macd.2.valueMACDHist}} < {{macd.1.valueMACDHist}} && {{macd.1.valueMACDHist}} < {{macd.0.valueMACDHist}}',
					actions: [
						// Place BUY flag.
						{ action: 'fetch', input: { save: 'detected', source: 'local', data: 'BUY' } },
						{ action: 'fetch', input: { save: 'opposite', source: 'local', data: 'SELL' } },
						// If crossovers are set, check if they are met for both entry and exit.
						{
							condition:
								'{{configuration.entryCrossover}} === false || {{macd.2.valueMACDHist}} < -({{configuration.entryCrossover}})',
							action: 'fetch',
							input: { save: 'entrySignal', source: 'local', data: 'BUY' },
						},
						{
							condition:
								'{{configuration.exitCrossover}} === false || {{macd.2.valueMACDHist}} < -({{configuration.exitCrossover}})',

							action: 'fetch',
							input: { save: 'exitSignal', source: 'local', data: 'BUY' },
						},
						{
							// Save price at MACD minimum.
							action: 'persist',
							input: { save: 'priceOnLastValley', source: 'local', data: '{{candles.2.low}}' },
						},
					],
				},
				{
					/**
					 * Potential SELL (Peak) Detected.
					 */
					name: 'Peak Detected',
					condition:
						// MACD has done a local max
						'{{macd.3.valueMACDHist}} < {{macd.2.valueMACDHist}} && {{macd.2.valueMACDHist}} > {{macd.1.valueMACDHist}} && {{macd.1.valueMACDHist}} > {{macd.0.valueMACDHist}}',
					actions: [
						// Place SELL flag.
						{ action: 'fetch', input: { save: 'detected', source: 'local', data: 'SELL' } },
						{ action: 'fetch', input: { save: 'opposite', source: 'local', data: 'BUY' } },
						// If crossovers are set, check if they are met for both entry and exit.
						{
							condition:
								'{{configuration.entryCrossover}} === false || {{macd.2.valueMACDHist}} > {{configuration.entryCrossover}}',
							action: 'fetch',
							input: { save: 'entrySignal', source: 'local', data: 'SELL' },
						},
						{
							condition:
								'{{configuration.exitCrossover}} === false || {{macd.2.valueMACDHist}} > {{configuration.exitCrossover}}',
							action: 'fetch',
							input: { save: 'exitSignal', source: 'local', data: 'SELL' },
						},

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
			 * 3. If position is open, perform re-entries, exits and ensure TPs and SL are set
			 */
			name: 'Position is open.',
			condition: '{{currentPosition.positionAmt}} !== 0',
			actions: [
				{
					name: 'Processing Exit Signal',
					condition:
						'"{{exitSignal}}" === "SELL" && {{currentPosition.positionAmt}} > 0 || "{{exitSignal}}" === "BUY" && {{currentPosition.positionAmt}} < 0',
					actions: [
						{
							// Send Notification
							action: 'sendNotification',
							input:
								'Exiting {{opposite}} position @ {{currentPrice}} [{{currentPosition.entryPrice}} -> {{currentPrice}}]',
						},
						{
							action: 'calculate',
							input: { save: 'quantity', data: 'Math.abs({{currentPosition.positionAmt}})' },
						},
						{
							// Close position
							action: 'createOrderIfNotExists',
							input: {
								side: '{{exitSignal}}' as 'BUY' | 'SELL',
								type: 'MARKET',
								quantity: '{{quantity}}',
								reduceOnly: true,
							},
						},
					],
				},
				{
					name: 'Processing potential re-entry',
					condition:
						'("{{entrySignal}}" === "SELL" && {{currentPosition.positionAmt}} < 0 || "{{entrySignal}}" === "BUY" && {{currentPosition.positionAmt}} > 0)' +
						'&& "{{configuration.reEntries.percentageSize}}" && +"{{configuration.reEntries.percentageSize}}" > 0 && Math.abs({{currentPosition.positionAmt}}) < +"{{configuration.reEntries.maxPosition}}"' +
						' && Math.abs(utils.differenceInMinutes(new Date({{currentPosition.updateTime}}), new Date())) > +"{{configuration.reEntries.interval}}"',
					actions: [
						{
							action: 'calculate',
							input: {
								save: 'reEntrySize',
								data:
									'(utils.percentage(Math.abs({{currentPosition.positionAmt}}), {{configuration.reEntries.percentageSize}})) + Math.abs({{currentPosition.positionAmt}}) > {{configuration.reEntries.maxPosition}} ' +
									'? {{configuration.reEntries.maxPosition}} - Math.abs({{currentPosition.positionAmt}})' +
									': (utils.percentage(Math.abs({{currentPosition.positionAmt}}), {{configuration.reEntries.percentageSize}})) ',
							},
						},
						{
							// Send Notification
							action: 'sendNotification',
							input: '{{entrySignal}} Re-Entry @ {{currentPrice}} (x{{reEntrySize}})',
						},
						{
							// Re-entry
							action: 'createOrderIfNotExists',
							input: {
								side: '{{entrySignal}}' as 'BUY' | 'SELL',
								type: 'MARKET',
								quantity: '{{reEntrySize}}',
								reduceOnly: false,
							},
						},
						// Remove old orders, as they are no longer valid because position amount changed.
						{ action: 'fetch', input: { source: 'binance', data: { method: 'deleteAllOrders' } } },
					],
				},
				{
					// Place stop loss if not present.
					name: 'Ensure Stop Loss in place',
					condition: '"{{configuration.stop}}"',
					actions: [
						{
							action: 'calculate',
							input: [
								{
									save: 'stopSide',
									data: '{{currentPosition.positionAmt}} > 0 ? "SELL" : "BUY"',
								},
								{
									save: 'stopPrice',
									data: 'utils.percentageIncrease({{currentPosition.entryPrice}}, -1 * Math.sign({{currentPosition.positionAmt}}) * {{configuration.stop}})',
								},
							],
						},
						{
							action: 'createOrderIfNotExists',
							input: {
								side: '{{stopSide}}' as 'BUY' | 'SELL',
								quantity: '{{currentPosition.positionAmt}}',
								price: '{{stopPrice}}',
								type: 'STOP_MARKET',
								reduceOnly: true,
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
			/**
			 * 4. If position is not open, check if we need to enter a position.
			 */
			name: 'Position is not open.',
			condition: '{{currentPosition.positionAmt}} === 0',
			actions: [
				// Remove old orders if any
				{ action: 'fetch', input: { source: 'binance', data: { method: 'deleteAllOrders' } } },
				{
					name: 'Processing Entry Signal',
					condition: '"{{entrySignal}}" !== ""',
					actions: [
						{
							// Send Notification
							action: 'sendNotification',
							input:
								'{{entrySignal}} Entry Signal @ {{currentPrice}} (TP2 is {{priceOnLastValley}}, TP1 is halfway)',
						},
						{
							action: 'createOrderIfNotExists',
							input: {
								side: '{{entrySignal}}' as 'BUY' | 'SELL',
								type: 'MARKET',
								quantity: '{{configuration.entrySize}}',
								reduceOnly: false,
							},
						},
					],
				},
			],
		},
	],
};
