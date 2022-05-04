import BinanceLibrary, {
	Binance as BinanceType,
	OrderSide_LT,
	OrderType_LT,
} from 'binance-api-node';
import short from 'short-uuid';

export class Binance {
	private client: BinanceType;

	constructor() {
		this.client = BinanceLibrary({
			apiKey: process.env.BINANCE_API_KEY,
			apiSecret: process.env.BINANCE_API_SECRET,
		});
	}

	public async getCurrentBalance(symbol: string, mode: string): Promise<number> {
		let balance;
		if (mode === 'SPOT') {
			const account = await this.client.accountInfo();
			balance = account.balances.find((b) => b.asset === symbol)?.free;
		} else if (mode === 'FUTURES') {
			const accounts = await this.client.futuresAccountBalance();
			balance = accounts.find((b) => b.asset === symbol)?.availableBalance;
		}

		return +balance;
	}

	public async getCurrentOrders(symbol: string, mode: string): Promise<any> {
		let open;
		if (mode === 'SPOT') {
			const orders = await this.client.openOrders({ symbol });
			// open = account.balances.find((b) => b.asset === symbol).free;
			open = orders;
		} else if (mode === 'FUTURES') {
			// @ts-expect-error for some reason, not in types
			const orders = await this.client.futuresAllOrders({ symbol });
			open = orders.filter((o) => o.status === 'NEW');
		}

		return open;
	}

	public async getCurrentPrice(pair: string, mode: string): Promise<number> {
		let price;
		if (mode === 'SPOT') {
			const ticker = await this.client.prices({ symbol: pair });
			price = ticker;
		} else if (mode === 'FUTURES') {
			const ticker = await this.client.futuresPrices();
			price = ticker[pair];
		}

		return +price;
	}

	public async getCurrentPosition(pair: string, mode: string): Promise<any> {
		let position;
		if (mode === 'SPOT') {
			return 0;
			// TODO: For spot, position is just the account status of the trade symbol.
			// position = await this.client.position({ symbol });
		} else if (mode === 'FUTURES') {
			position = await this.client.futuresPositionRisk({ symbol: pair });
			position = position[0];
		}

		return position;
	}

	public async createOrder(
		pair: string,
		mode: string,
		side: string,
		// Specified in coins unit
		quantity?: number,
		// Respect to the reference
		price?: number,
		type = 'LIMIT',
		reduceOnly?: 'true' | 'false',
		// closePosition?: 'true' | 'false',
		callback?: number,
	): Promise<any> {
		if (mode === 'SPOT') {
			// TODO:
			return;
		} else if (mode === 'FUTURES') {
			const data = {
				newClientOrderId: `MINI_TRADER:${short.generate()}`,
				price,
				quantity: quantity?.toString(),
				reduceOnly:
					reduceOnly ||
					(type === 'LIMIT' ? ('true' as 'true' | 'false') : ('false' as 'true' | 'false')),
				side: side as OrderSide_LT,
				symbol: pair,
				type: type as OrderType_LT,
				// closePosition: closePosition || 'false',
			};

			if (!price) {
				delete data.price;
			}
			if (!quantity) {
				delete data.quantity;
			}
			if (type === 'TRAILING_STOP_MARKET') {
				delete data.price;
				// @ts-expect-error activation
				data.activationPrice = price.toString();
				// @ts-expect-error callback
				data.callbackRate = callback?.toString();
			}
			if (type === 'STOP_MARKET') {
				delete data.price;
				// @ts-expect-error activation
				data.stopPrice = price.toString();
			}
			// if (closePosition === 'true') {
			// 	// @ts-expect-error fru
			// 	delete data.reduceOnly;
			// }

			const order = await this.client.futuresOrder(data);
			return order;
		}
	}

	public async setIsolatedLeverage(pair: string, leverage: number) {
		await this.client
			.futuresMarginType({ marginType: 'ISOLATED', symbol: pair })
			.catch(() => console.log('Margin ok'));
		await this.client.futuresLeverage({ leverage: leverage, symbol: pair });
	}

	public async deleteOrder(pair: string, mode: string, orderId: number) {
		if (mode === 'SPOT') {
			return;
		} else if (mode === 'FUTURES') {
			await this.client.futuresCancelOrder({ symbol: pair, orderId });
		}
	}

	public async deleteAllOrders(pair: string, mode: string) {
		if (mode === 'SPOT') {
			return;
		} else if (mode === 'FUTURES') {
			await this.client.futuresCancelAllOpenOrders({ symbol: pair });
		}
	}

	public async getPrecision(pair: string, mode: string): Promise<number> {
		if (mode === 'SPOT') {
			// TODO:
			return 0;
		} else if (mode === 'FUTURES') {
			const exchangeInfo = await this.client.futuresExchangeInfo();
			const symbol = exchangeInfo.symbols.find(
				// @ts-expect-error pair and contract not present in types
				(s) => s.pair === pair && s.contractType === 'PERPETUAL',
			);
			// @ts-expect-error precision not present in types
			return symbol?.quantityPrecision as number;
		}
		return 0;
	}

	public async getPricePrecision(pair: string, mode: string): Promise<number> {
		if (mode === 'SPOT') {
			// TODO:
			return 0;
		} else if (mode === 'FUTURES') {
			const exchangeInfo = await this.client.futuresExchangeInfo();
			const symbol = exchangeInfo.symbols.find(
				// @ts-expect-error pair and contract not present in types
				(s) => s.pair === pair && s.contractType === 'PERPETUAL',
			);
			// @ts-expect-error precision not present in types
			return symbol?.pricePrecision as number;
		}
		return 0;
	}

	public async getFilledOrders(
		pair: string,
		mode: string,
		dates?: { start: Date; end: Date },
	): Promise<any> {
		let filled;
		if (mode === 'SPOT') {
			const orders = await this.client.openOrders({ symbol: pair });
			// open = account.balances.find((b) => b.asset === symbol).free;
			filled = orders;
		} else if (mode === 'FUTURES') {
			const data = {
				symbol: pair,
				startTime: dates?.start?.getTime(),
				endTime: dates?.end?.getTime(),
			};

			if (!dates?.start) {
				delete data?.startTime;
			}

			if (!dates?.end) {
				delete data?.endTime;
			}
			// @ts-expect-error for some reason, not in types
			const orders = await this.client.futuresAllOrders(data);
			filled = orders.filter((o) => o.status === 'FILLED');
		}

		return filled;
	}

	public async getIncomeHistory(
		symbol?: string,
		mode = 'FUTURES',
		dates?: { start: Date; end: Date },
	): Promise<any> {
		if (mode !== 'FUTURES') {
			return [];
		}
		const data = {
			limit: 1000,
			symbol,
			startTime: dates?.start?.getTime(),
			endTime: dates?.end?.getTime(),
		};

		if (!symbol) {
			delete data.symbol;
		}
		if (!dates?.start) {
			delete data?.startTime;
		}

		if (!dates?.end) {
			delete data?.endTime;
		}

		const income: any = [];
		let res;
		while (!res || res.length === 1000) {
			res = await this.client.futuresIncome(data);
			income.push(...res);

			// data.fromId = res[res.length - 1].tradeId;
			data.startTime = res[res.length - 1].time;
		}

		return income;
	}
}
