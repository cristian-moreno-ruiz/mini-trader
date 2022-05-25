export const BollingerRsiAdx = {
	description:
		'Buy Entry Signal (price = bollinger lower band && RSI < 20 && ADX > 32' +
		'Sell Entry Signal (price = bollinger upper band && RSI > 80 && ADX > 32',
	stages: [
		{
			type: 'load',
			variables: [
				{
					name: 'bollinger',
					source: 'taapi',
					input: { indicator: 'bbands2', params: { backtracks: 3, period: 20, stddev: 2 } },
				},
				{
					name: 'currentPosition',
					source: 'binance',
					input: { method: 'getCurrentPosition' },
				},
				{
					name: 'currentPrice',
					source: 'binance',
					input: { method: 'getCurrentPrice' },
				},
				{
					name: 'currentOrders',
					source: 'binance',
					input: { method: 'getCurrentOrders' },
				},
				{
					name: 'rsi',
					source: 'taapi',
					input: { indicator: 'rsi', params: { optInTimePeriod: 14 } },
				},
				{
					name: 'entryOrder',
					source: 'local',
					eval: 'this.variables.currentOrders?.find(order => this.variables.currentOrders.length === 1 && orders[0].type === "LIMIT" && +orders[0].origQty === this.configuration.entrySize)',
				},
				{
					name: 'adx',
					source: 'taapi',
					input: { indicator: 'adx', params: { optInTimePeriod: 14 } },
				},
			],
		},
		{
			type: 'execute',
			actions: [
				{
					name: 'Position is open.',
					condition: '+this.variables.currentPosition.positionAmt !== 0',
					actions: [
						{
							action: 'log',
							input: '`Upper: ${this.variables.bollinger[0].valueUpperBand}`',
						},
						// {
						// 	action: 'sendNotification',
						// 	input: '`Upper: ${this.variables.bollinger[0].valueUpperBand}`',
						// },
					],
				},
				{
					name: 'Position is not yet open.',
					condition: '+this.variables.currentPosition.positionAmt === 0',
					actions: [
						{
							name: 'BUY Entry Signal',
							condition:
								// 'this.currentPrice < +this.variables.bollinger[0].valueLowerBand && +this.variables.rsi[0].value < 30',
								'this.variables.currentPrice < +this.variables.bollinger[0].valueLowerBand',
							// condition: 'true === true',
							action: 'sendNotification',
							input:
								'`Buy Entry Signal @${this.variables.currentPrice} (Below LowerBand + RSI <30): ADX = ${this.variables.adx.value}, RSI: ${this.variables.rsi.value}`',
						},
						{
							name: 'SELL Entry Signal',
							condition:
								// 'this.currentPrice > +this.variables.bollinger[0].valueUpperBand && +this.variables.rsi[0].value > 70',
								'this.variables.currentPrice > +this.variables.bollinger[0].valueUpperBand',
							action: 'sendNotification',
							input:
								'`SELL Entry Signal @${this.variables.currentPrice} (Above UpperBand + RSI > 70): ADX = ${this.variables.adx.value}, RSI: ${this.variables.rsi.value}`',
						},
						// {
						// 	name: 'No entry order in place',
						// 	condition: '!this.variables.entryOrder',
						// 	// TODO: Add entry order if trend.
						// 	action: 'log',
						// 	input: '`Upper: ${this.variables.bollinger[0].valueUpperBand}`',

						// },
						// {
						// 	name: 'Entry order in place',
						// 	condition: 'this.variables.entryOrder',
						// 	// TODO: Check if value still valid
						// 	action: 'log',
						// 	input: '`Upper: ${this.variables.bollinger[0].valueUpperBand}`',

						// },
					],
				},
			],
		},
	],
};
