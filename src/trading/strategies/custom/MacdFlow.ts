import { StrategyDefinition } from './types';

export const MacdFlow: StrategyDefinition = {
	description: 'Buy on MACD valley and sell on MACD peak.',
	stages: [
		{
			/**
			 * 1. Fetch Technical analysis data.
			 */
			action: 'load',
			input: [
				{
					name: 'macd',
					source: 'taapi',
					data: { indicator: 'macd', params: { backtracks: 20 } },
				},
				{
					name: 'candles',
					source: 'taapi',
					data: { indicator: 'candles', params: { backtracks: 20 } },
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
						{ action: 'load', input: { name: 'buy', source: 'local', data: true } },
						// Save price at MACD minimum.
						{
							action: 'persist',
							input: { name: 'priceOnLastValley', source: 'local', data: '{{candles.2.low}}' },
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
						{ action: 'load', input: { name: 'sell', source: 'local', data: true } },
						// Save price at MACD maximum.
						{
							action: 'persist',
							input: { name: 'priceOnLastPeak', source: 'local', data: '{{candles.2.high}}' },
						},
					],
				},
			],
		},
		{
			name: 'Position is not open.',
			condition: '+this.builtin.currentPosition.positionAmt === 0',
			actions: [
				// TODO:
				// {
				// 	name: 'Remove old orders if any.',
				// },

				{
					name: 'Processing SELL Entry Signal',
					condition: '{{sell}}',
					actions: [
						{
							// Send Notification
							action: 'sendNotification',
							input:
								'SELL Entry Signal @ {{priceOnLastPeak}} (TP2 is {{priceOnLastValley}}, TP1 is halfway)',
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
		{
			name: 'Position is open.',
			condition: '+this.builtin.currentPosition.positionAmt !== 0',
			actions: [
				// * At any time, if MACD goes in the opposite direction, close the position (specially if in profit).
				// 1. Place Stop Loss if not present
				// 2. Place TP1 if not present
				// 3. If TP1 reached, place TP2 if not present, and move SL to entry
				// 4. If TP2 reached, move SL to TP1 (if necessary) and determine if need to exit position
			],
		},
	],
};
