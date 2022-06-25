import { differenceInSeconds } from 'date-fns';
import { Api } from 'telegram';
import { Bybit } from '../../providers/bybit';
import { getClient } from '../../providers/telegram';
import { AbstractStrategy } from './AbstractStrategy';
import { SignalsConfiguration } from './types';

export class Signals extends AbstractStrategy {
	private telegram = getClient();
	private processed: number[] = [];
	private bybit = new Bybit();
	// public configuration: SignalsConfiguration;

	constructor(configuration: SignalsConfiguration) {
		super(configuration);
	}

	public async init(): Promise<void> {
		// throw new Error('Method not implemented.');
		await this.telegram.connect();
		console.log('nothing to do');
	}

	public async trade(): Promise<boolean> {
		const messages = await this.getLastUnprocessedMessages();

		for (const message of messages) {
			try {
				this.processed.push(message.id);
				this.log(`Processing message ${message.content}`);
				const signal = this.parseMessage(message.content);
				if (signal === null) {
					continue;
				}

				await this.executeOperation(signal);
			} catch (err) {
				this.sendNotification(`There was an error copying a signal: ${err}`);
				this.error(err);
			}
		}
		return true;
	}

	private async getLastUnprocessedMessages() {
		if (this.telegram.connected !== true) {
			await this.telegram.connect();
		}
		const dialogs = await this.telegram.getDialogs({});
		const dialog = dialogs.find(
			(d) => d.name === (this.configuration as SignalsConfiguration).dialog,
		);

		// 1. Get the id and time of the last. If < 5 minutes, get other 5 messages within 5 minutes.
		const diff = differenceInSeconds(
			Date.now(),
			new Date((dialog?.message?.date as number) * 1000),
		);

		if (diff > 300) {
			return [];
		}

		const messages = (await this.telegram.invoke(
			new Api.channels.GetMessages({
				channel: dialog?.entity,
				id: [
					// @ts-expect-error some
					dialog?.message?.id,
					// @ts-expect-error some
					dialog?.message?.id - 1,
					// @ts-expect-error some
					dialog?.message?.id - 2,
					// @ts-expect-error some
					dialog?.message?.id - 3,
					// @ts-expect-error some
					dialog?.message?.id - 4,
				],
			}),
		)) as Api.messages.ChannelMessages;

		// 2. Filter to get only the last 5 minutes and unprocessed, and return array with message and id.
		const last5min = (messages.messages as Api.Message[])?.filter(
			(m) =>
				differenceInSeconds(Date.now(), new Date((m.date as number) * 1000)) < 300 &&
				!this.processed.includes(m.id),
		);

		return last5min.map((m) => ({ content: m.message, id: m.id }));
	}

	private parseMessage(message: string) {
		console.log('parsing');

		// if there are only two prices, add another in between.

		if (!message?.includes('BTC/USDT')) {
			return null;
		}

		return {
			symbol: 'AVAX/USDT',
			side: 'SHORT',
			price: [0.00803, 0.00849],
			profit: [0.00805, 0.0079, 0.077],
			stop: 0.00867,
			leverage: 10,
		};
	}

	private async executeOperation(signal) {
		const symbol = `${signal.symbol.split('/')[0]}${signal.symbol.split('/')[1]}`;
		this.log(`Executing signal: ${JSON.stringify(signal)}`);

		// 0. Set proper margin (isolated) and leverage for the signal.
		const res = await this.bybit.setIsolatedLeverage({ symbol, leverage: signal.leverage });

		// 1. Check if position is open
		const position = await this.bybit.getCurrentPosition({ symbol });

		// Exit if position is open.
		if (position.length && position[0]?.size !== 0) {
			return;
		}

		// 2. Cancel previous order if necessary
		await this.bybit.deleteAllOrders({ symbol });

		// 3. Check current price
		const price = await this.bybit.getCurrentPrice({ symbol });

		// 4. Create all orders

		// 4.1 Calculate entrySize.
		const balance = await this.bybit.getCurrentBalance({ coin: 'USDT' });

		const size = Math.floor(balance / price[0]);
		console.log(`Size: ${size}`);

		// TODO: Need to check how to handle minimum buy, price diff, decimals and rounding, etc
	}
}
