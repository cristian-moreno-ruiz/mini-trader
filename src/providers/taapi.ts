import { differenceInSeconds } from 'date-fns';
import * as taapi from 'taapi';

const secondsBetweenRequests = 16;

const keys = [
	process.env.TAAPI_API_KEY_1,
	// process.env.TAAPI_API_KEY_2,
	// process.env.TAAPI_API_KEY_3,
	// process.env.TAAPI_API_KEY_4,
	// process.env.TAAPI_API_KEY_5,
];

const pool = {
	clients: keys.map((key) => ({
		client: taapi.client(key),
		queue: 0,
		lastRequest: new Date(Date.now() - 20000).getTime(),
	})),
	next: 0,
};

export class Taapi {
	private client;
	private exchange = 'binance';
	// private lastRequest: Date | undefined;
	// private queue = 0;

	private async getClient() {
		const index = pool.next;
		const client = pool.clients[index];
		pool.next = (index + 1) % pool.clients.length;
		client.queue++;

		if (
			client.queue > 1 ||
			(client.lastRequest &&
				differenceInSeconds(Date.now(), client.lastRequest) < secondsBetweenRequests)
		) {
			const waitTime = Math.abs(
				(client.queue - 1) * secondsBetweenRequests +
					(differenceInSeconds(Date.now(), client.lastRequest) - secondsBetweenRequests) * 1000,
			);
			await new Promise((resolve) => setTimeout(resolve, waitTime));
		}
		client.lastRequest = Date.now();
		return [client.client, index];
	}

	private decreaseQueue(index: number) {
		pool.clients[index].lastRequest = Date.now();
		pool.clients[index].queue--;
	}

	/**
	 * Return upper, middle (mean) and lower bollinger bands.
	 * Accepts a backtracks param (how may candles to return) and a back param (ignore last X candles).
	 */
	public async getBollingerData(
		pair: string,
		interval: string,
		backtracks = 1,
		period = 20,
		stdDev = 2,
		back = 0,
	): Promise<BollingerData[]> {
		const data = await this.getIndicator('bbands2', pair, interval, {
			backtracks,
			backtrack: back,
			period,
			stddev: stdDev,
		});

		return data;
	}

	public async getIndicator<T>(
		indicator: T,
		pair: string,
		interval: string,
		params: any,
	): Promise<Result<T>> {
		const [client, index] = await this.getClient();

		const data = await client
			.getIndicator(indicator, this.exchange, pair, interval, params)
			.catch((err) => {
				this.decreaseQueue(index);
				throw err;
			});

		this.decreaseQueue(index);
		return data;
	}
}

interface BollingerData {
	valueUpperBand: number;
	valueMiddleBand: number;
	valueLowerBand: number;
}

// interface Result<T> {
// 	data: T[];
// }

type Result<T> = T extends 'bbands2' ? BollingerData : never;
