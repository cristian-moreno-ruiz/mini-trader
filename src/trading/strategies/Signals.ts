/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { differenceInSeconds } from 'date-fns';
import { Api } from 'telegram';
import { Bybit } from '../../providers/bybit';
import { getClient } from '../../providers/telegram';
import { round } from '../../utils';
import { AbstractStrategy } from './AbstractStrategy';
import { SignalsConfiguration } from './types';

export class Signals extends AbstractStrategy {
	private telegram = getClient();
	private processed: number[] = [];
	private bybit = new Bybit();

	constructor(public configuration: SignalsConfiguration) {
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
				this.log(`Processing message ${message.content}`);
				const signal = this.parseMessage(message.content);
				if (signal === null) {
					continue;
				}

				this.processed.push(message.id);
				await this.executeOperation(signal);
				await this.sendTelegramNotification(
					`Successfully started copying signal ${JSON.stringify(signal)}`,
				);
				// TODO: Create a "Follower" function.
			} catch (err) {
				await this.sendTelegramNotification(`There was an error copying a signal: ${err}`);
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
		const dialog = dialogs.find((d) => d.name === this.configuration.dialog);

		// 1. Get the id and time of the last. If < 5 minutes, get other 5 messages within 5 minutes.
		// TODO: Last updated (edited) time
		const diff = differenceInSeconds(
			Date.now(),
			new Date((dialog?.message?.date as number) * 1000),
		);

		// FIXME: This is to test Spider Signals.
		// return [
		// 	{
		// 		id: 1,
		// 		content:
		// 			'📉 SHORT(5-10X):AVAX/USDT #señal012❌\n🟡 Precio: 17.2 / 18\n✅ TP: 15.9 / 13.3 / 10\n❌ SL: 18.93',
		// 	},
		// ];

		// return [
		// 	{
		// 		id: 1,
		// 		content: '🔰 ENTRADA  2 50x 🔰Precio💰: 1.406Take Profit  : 1.394 / 1SL : 1.409(0.21%) 1:4',
		// 	},
		// ];

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

		// TODO: Last updated (edited) time
		return last5min.map((m) => ({ content: m.message, id: m.id }));
	}

	public parseMessage(message: string): Signal | null {
		if (!message) {
			return null;
		}
		// 1. Get the side of the signal.
		const [_, side] = message.match(/(LONG|SHORT|Long|Short)/) || [];

		// 2. Get the symbol.
		const [_g, symbol] = [...message.matchAll(/([A-Z]+)[ /]*(USDT)/g)][0] || [];

		// 3. Get entries
		// Precio(?:[^A-z])*[: ]*([0-9,.\/ ]*)
		const [priceLine] =
			message.match(/Precio.*([0-9,./ ]*)\n/m) || message.match(/Price:([0-9,./ ]*)\n/m) || [];
		const prices = priceLine ? [...priceLine?.matchAll(/[/ ]*([0-9.,]*)/g)] : [];
		const entries = prices?.map((regex) => +regex[1]).filter((n) => n !== 0);

		// 4. Get Profits.
		const [tpLine] =
			message.match(/tp:([0-9,./ ]*)\n/m) || message.match(/profit(?:[^A-z])*([0-9,./ ]*)/im) || [];
		const tps = tpLine ? [...tpLine?.matchAll(/[/ ]+([0-9.,]*)/g)] : [];
		const profits = tps?.map((regex) => +regex[1]).filter((n) => n !== 0);

		// 5. Get SL
		const [_sg, stop] = [...message.matchAll(/(?:Stop|SL)[: /]*([0-9,./ ]*)/g)][0] || [];

		// If any of the above is missing, return null.
		if (!symbol || !entries.length || !profits.length || !stop) {
			return null;
		}

		// 6. Get the leverage.
		const [_l, leverageLine] = message.match(/([0-9]+)[xX]/m) || [];
		const leverage = leverageLine ? leverageLine : message.includes('Scalping') ? '10' : '5';

		console.log(symbol, side, entries, profits, stop, leverage);

		// FIXME: These are just for me to test the strategy.
		// return {
		// 	symbol: 'AVAX/USDT',
		// 	side: 'SHORT',
		// 	entries: [21.33376, 22.556],
		// 	profit: [20, 19.789, 21.075],
		// 	stop: 22.601,
		// 	leverage: 5,
		// };
		return {
			symbol: `${symbol}/USDT`,
			side: (side.toUpperCase() as 'LONG' | 'SHORT') || (entries[0] > +stop ? 'LONG' : 'SHORT'),
			entries,
			profit: profits,
			stop: +stop,
			leverage: +leverage,
		};
	}

	public async executeOperation(signal: Signal): Promise<void> {
		const symbol = `${signal.symbol.split('/')[0]}${signal.symbol.split('/')[1]}`;
		this.log(`Executing signal: ${JSON.stringify(signal)}`);

		// 0. Set proper margin (isolated) and leverage for the signal.
		// TODO: Check max leverage first
		await this.bybit.setIsolatedLeverage({ symbol, leverage: signal.leverage });

		// 1. Check if position is open
		const position = await this.bybit.getCurrentPosition({ symbol });

		// Exit if position is open.
		if (position.length && position[0]?.size !== 0) {
			return;
		}

		// 2. Cancel previous order if necessary
		await this.bybit.deleteAllOrders({ symbol });

		// TODO: May want to check the price and enter to market if necessary.
		// 3. Check current price
		// const price = await this.bybit.getCurrentPrice({ symbol });

		// 4. Create all orders

		// 4.1 Calculate entrySize.
		const balance = await this.bybit.getCurrentBalance({ coin: 'USDT' });
		const precision = await this.bybit.getPrecision({ symbol });

		const approxUsdSize = Math.min(
			(balance.total * this.configuration.percentageSize) / 100,
			balance.available,
		);

		const entrySize = round(
			(signal.leverage * approxUsdSize) /
				((signal.entries[1] || signal.entries[0]) * signal.entries.length),
			precision.quantity,
		);

		// 4.2 Create entry orders.
		for (const entry of signal.entries) {
			await this.bybit.createOrder({
				symbol,
				side: signal.side === 'LONG' ? 'BUY' : 'SELL',
				type: 'LIMIT',
				price: round(entry, precision.price),
				quantity: entrySize,
				stop: round(signal.stop, precision.price),
				profit: round(signal.profit[0], precision.price),
			});
		}

		// 4.3 Create profit orders.
		// FIXME: This will need to go on the "follow trade" function.
		// const profitSize = (entrySize * signal.entries.length) / signal.profit.length;

		// for (const profit of signal.profit) {
		// 	await this.bybit.createOrder({
		// 		symbol,
		// 		side: signal.side === 'LONG' ? 'SELL' : 'BUY',
		// 		type: 'LIMIT',
		// 		price: round(profit, precision.price),
		// 		quantity: round(profitSize, precision.quantity),
		// 		reduceOnly: true,
		// 	});
		// }

		// TODO: Need to check how to handle minimum buy, price diff, decimals and rounding, etc
	}

	public async sendTelegramNotification(message: string): Promise<void> {
		if (this.telegram.connected !== true) {
			await this.telegram.connect();
		}
		const dialogs = await this.telegram.getDialogs({});
		const dialog = dialogs.find((d) => d.name === 'CriptoTest');

		await this.telegram.sendMessage(dialog?.entity!, { message });
	}
}

interface Signal {
	symbol: string;
	side: 'LONG' | 'SHORT';
	entries: number[];
	profit: number[];
	stop: number;
	leverage: number;
}
