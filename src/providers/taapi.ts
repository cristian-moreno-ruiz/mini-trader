import { differenceInSeconds } from 'date-fns';
import * as taapi from 'taapi';

const secondsBetweenRequests = 15;

export class Taapi {
	private client;
	private exchange = 'binance';
	private lastRequest: Date | undefined;
	private queue = 0;

	constructor() {
		this.client = taapi.client(process.env.TAAPI_API_KEY);
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
		let queue = false;
		if (
			this.queue > 0 ||
			(this.lastRequest &&
				differenceInSeconds(new Date(), this.lastRequest) < secondsBetweenRequests)
		) {
			this.queue++;
			queue = true;
			const waitTime = Math.abs(
				this.queue * secondsBetweenRequests +
					(differenceInSeconds(new Date(), this.lastRequest as Date) - secondsBetweenRequests) *
						1000,
			);
			await new Promise((resolve) => setTimeout(resolve, waitTime));
		}
		const data = await this.client.getIndicator(indicator, this.exchange, pair, interval, params);
		this.lastRequest = new Date();
		if (queue) {
			this.queue--;
		}

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
