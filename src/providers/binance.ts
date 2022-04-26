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
		quantity: number,
		price?: number,
		type = 'LIMIT',
	): Promise<any> {
		if (mode === 'SPOT') {
			// TODO:
			return;
		} else if (mode === 'FUTURES') {
			const data = {
				newClientOrderId: `MINI_TRADER:${short.generate()}`,
				price,
				quantity: quantity.toString(),
				reduceOnly: side === 'SELL' ? ('true' as 'true' | 'false') : ('false' as 'true' | 'false'),
				side: side as OrderSide_LT,
				symbol: pair,
				type: type as OrderType_LT,
			};

			if (!price) {
				delete data.price;
			}

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

	public async deleteAllOrders(pair: string, mode: string) {
		if (mode === 'SPOT') {
			return;
		} else if (mode === 'FUTURES') {
			await this.client.futuresCancelAllOpenOrders({ symbol: pair });
		}
	}
}
