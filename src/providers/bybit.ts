/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { LinearClient } from 'bybit-api';

export class Bybit {
	private client: LinearClient;

	constructor() {
		this.client = new LinearClient(process.env.BYBIT_API_KEY, process.env.BYBIT_API_SECRET, true);
	}

	public async getCurrentBalance({ coin }: { coin: string }): Promise<any> {
		const res = await this.client.getWalletBalance({ coin });

		if (res.ret_code !== 0 && res.ret_code !== 130056) {
			throw new Error(res.ret_msg);
		}

		return {
			available: res.result?.USDT?.available_balance,
			total: res.result?.USDT?.wallet_balance,
		};
	}

	public async getPrecision({ symbol }: { symbol: string }): Promise<any> {
		const res = await this.client.getSymbols();

		if (res.ret_code !== 0 && res.ret_code !== 130056) {
			throw new Error(res.ret_msg);
		}

		const symbolInfo = res.result.find((s) => s.name === symbol);
		const qtyDecimals = Math.abs(
			Math.round(Math.log(symbolInfo?.lot_size_filter?.qty_step!) / Math.log(10)),
		);

		return {
			price: symbolInfo?.price_scale,
			quantity: qtyDecimals !== Infinity ? qtyDecimals : 0,
		};
	}

	public async setIsolatedLeverage({
		symbol,
		leverage,
	}: {
		symbol: string;
		leverage: number;
	}): Promise<any> {
		let res = await this.client.setMarginSwitch({
			symbol,
			is_isolated: false,
			buy_leverage: leverage,
			sell_leverage: leverage,
		});

		if (res.ret_code !== 0 && res.ret_code !== 130056) {
			throw new Error(res.ret_msg);
		}

		res = await this.client.setMarginSwitch({
			symbol,
			is_isolated: true,
			buy_leverage: leverage,
			sell_leverage: leverage,
		});

		if (res.ret_code !== 0 && res.ret_code !== 130056) {
			throw new Error(res.ret_msg);
		}
		return res.result;
	}

	public async getCurrentPrice({ symbol }: { symbol: string }): Promise<any> {
		const res = await this.client.getTickers({ symbol });

		if (res.ret_code !== 0) {
			throw new Error(res.ret_msg);
		}

		return res.result?.[0]?.last_price;
	}

	public async getCurrentPosition({ symbol }: { symbol: string }): Promise<any> {
		const res = await this.client.getPosition({ symbol });

		if (res.ret_code !== 0) {
			throw new Error(res.ret_msg);
		}

		return res.result
			.filter((p) => p.size !== 0)
			.map((p) => ({
				symbol: p.symbol,
				leverage: p.leverage,
				size: p.side === 'Buy' ? p.size : -p.size,
				side: p.side === 'Buy' ? 'BUY' : 'SELL',
			}));
	}

	public async createOrder({
		symbol,
		side,
		quantity,
		price,
		type = 'MARKET',
		reduceOnly = false,
		profit,
		stop,
	}: {
		symbol: string;
		side: 'BUY' | 'SELL';
		/**
		 * Quantity of contracts (coin unit)
		 */
		quantity: number;
		price?: number;
		type: 'LIMIT' | 'MARKET';
		reduceOnly?: boolean;
		profit?: number;
		stop?: number;
	}): Promise<any> {
		const res = await this.client.placeActiveOrder({
			side: side === 'BUY' ? 'Buy' : 'Sell',
			symbol,
			qty: quantity,
			order_type: type === 'LIMIT' ? 'Limit' : 'Market',
			price,
			reduce_only: reduceOnly,
			stop_loss: stop,
			take_profit: profit,
			// We default to these for now, they are required params.
			time_in_force: 'GoodTillCancel',
			close_on_trigger: reduceOnly,
		});

		if (res.ret_code !== 0) {
			throw new Error(res.ret_msg);
		}

		return res.result;
	}

	public async deleteAllOrders({ symbol }: { symbol: string }): Promise<any> {
		const res = await this.client.cancelAllActiveOrders({ symbol });

		if (res.ret_code !== 0) {
			throw new Error(res.ret_msg);
		}

		return res.result;
	}
}
