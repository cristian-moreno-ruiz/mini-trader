import { StrategyDefinition } from './types';

export const DoubleSuperTrend: StrategyDefinition = {
	description:
		'Long term super trends signals trend, the short term super trend shows entries when it switch to same direction',
	stages: [
		{
			action: 'load',
			input: [
				{
					name: 'supertrendLT',
					source: 'taapi',
					data: { indicator: 'supertrend', params: { backtracks: 20, period: 20, multiplier: 5 } },
				},
				{
					name: 'supertrendST',
					source: 'taapi',
					data: { indicator: 'supertrend', params: { backtracks: 20, period: 8, multiplier: 3 } },
					// input: { indicator: 'supertrend', params: { backtracks: 20, period: 10, multiplier: 3 } },
				},
				{
					name: 'dmi',
					source: 'taapi',
					data: { indicator: 'dmi', params: { optInTimePeriod: 14, backtracks: 3 } },
				},
				{
					name: 'atr',
					source: 'taapi',
					data: { indicator: 'atr', params: { optInTimePeriod: 14, backtracks: 3 } },
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
					name: 'Logging SuperTrends, ADX and ATR',
					condition: 'true === true',
					action: 'log',
					input:
						'Current Indicator levels @{{currentPrice}}:' +
						'\n  - Short Term SuperTrend ({{supertrendST.0.value}}): {{supertrendST.2.valueAdvice}}, {{supertrendST.1.valueAdvice}}, {{supertrendST.0.valueAdvice}}.' +
						'\n  - Long Term SuperTrend ({{supertrendLT.0.value}}): {{supertrendLT.2.valueAdvice}}, {{supertrendLT.1.valueAdvice}}, {{supertrendLT.0.valueAdvice}}.' +
						'\n  - ADX [REF: 23]: {{dmi.2.adx}}, {{dmi.1.adx}}, {{dmi.0.adx}}.' +
						'\n  - DI+ [REF: 23]: {{dmi.2.plusdi}}, {{dmi.1.plusdi}}, {{dmi.0.plusdi}}.' +
						'\n  - DI- [REF: 23]: {{dmi.2.minusdi}}, {{dmi.1.minusdi}}, {{dmi.0.minusdi}}.' +
						'\n  - ATR: {{atr.2.value}}, {{atr.1.value}}, {{atr.0.value}}.',
				},
				// FIXME: Just a test
				{
					name: 'Logging SuperTrends, ADX and ATR',
					condition: 'true === true',
					action: 'log',
					input: {
						some: 'param',
						price: '{{currentPrice}}',
					},
				},
				{
					name: 'Short Term SuperTrend has switched',
					condition:
						'this.variables.supertrendST[1].valueAdvice !== this.variables.supertrendST[2].valueAdvice',
					actions: [
						{
							action: 'sendNotification',
							input:
								'Change in short term super trend detected @{{currentPrice}}:' +
								'\n  - Short Term SuperTrend ({{supertrendST.0.value}}): {{supertrendST.2.valueAdvice}}, {{supertrendST.1.valueAdvice}}, {{supertrendST.0.valueAdvice}}.' +
								'\n  - Long Term SuperTrend ({{supertrendLT.0.value}}): {{supertrendLT.2.valueAdvice}}, {{supertrendLT.1.valueAdvice}}, {{supertrendLT.0.valueAdvice}}.' +
								'\n  - ADX [REF: 23]: {{dmi.2.adx}}, {{dmi.1.adx}}, {{dmi.0.adx}}.' +
								'\n  - DI+ [REF: 23]: {{dmi.2.plusdi}}, {{dmi.1.plusdi}}, {{dmi.0.plusdi}}.' +
								'\n  - DI- [REF: 23]: {{dmi.2.minusdi}}, {{dmi.1.minusdi}}, {{dmi.0.minusdi}}.' +
								'\n  - ATR: {{atr.2.value}}, {{atr.1.value}}, {{atr.0.value}}.',
						},
						{
							condition:
								'this.variables.supertrendST[1].valueAdvice === this.variables.supertrendLT[1].valueAdvice',
							// TODO:
							// action: 'openPosition',
							action: 'log',
							input: {},
						},
					],
				},
				{
					name: 'ADX has crossed over 23',
					condition: 'this.variables.dmi[2].adx < 23 && this.variables.dmi[1].adx > 23',
					// TODO: Check if long term remained in same direction than previously
					action: 'sendNotification',
					input:
						'ADX has crossed over 23 @{{currentPrice}}:' +
						'\n  - Short Term SuperTrend ({{supertrendST.0.value}}): {{supertrendST.2.valueAdvice}}, {{supertrendST.1.valueAdvice}}, {{supertrendST.0.valueAdvice}}.' +
						'\n  - Long Term SuperTrend ({{supertrendLT.0.value}}): {{supertrendLT.2.valueAdvice}}, {{supertrendLT.1.valueAdvice}}, {{supertrendLT.0.valueAdvice}}.' +
						'\n  - ADX [REF: 23]: {{dmi.2.adx}}, {{dmi.1.adx}}, {{dmi.0.adx}}.' +
						'\n  - DI+ [REF: 23]: {{dmi.2.plusdi}}, {{dmi.1.plusdi}}, {{dmi.0.plusdi}}.' +
						'\n  - DI- [REF: 23]: {{dmi.2.minusdi}}, {{dmi.1.minusdi}}, {{dmi.0.minusdi}}.' +
						'\n  - ATR: {{atr.2.value}}, {{atr.1.value}}, {{atr.0.value}}.',
				},
			],
		},
		{
			name: 'Position is open.',
			condition: '+this.builtin.currentPosition.positionAmt !== 0',
			actions: [
				// TODO: Probably this will just be to place take profit and stop loss orders.
			],
		},
	],
};
