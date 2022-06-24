import { differenceInSeconds } from 'date-fns';
import { Api } from 'telegram';
import { getClient } from '../../providers/telegram';
import { AbstractStrategy } from './AbstractStrategy';
import { SignalsConfiguration } from './types';

export class Signals extends AbstractStrategy {
	private telegram = getClient();
	private processed: number[] = [];
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
			console.log(message.content);
			this.processed.push(message.id);
			console.log(this.processed);
		}
		return true;
	}

	private async getLastUnprocessedMessages() {
		// await this.telegram.connect();
		// const chats = await this.telegram.invoke(new Api.messages.GetAllChats({ exceptIds: [] }));
		// const channels = await this.telegram.invoke(new Api.channels.GetChannels({}));
		if (this.telegram.connected !== true) {
			await this.telegram.connect();
		}
		const dialogs = await this.telegram.getDialogs({});

		// TODO: param in the strat
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
		// const last = {
		// 	dialog?.message
		// }

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
		const final = (messages.messages as Api.Message[])?.filter(
			(m) =>
				// TODO: Change the comparator
				differenceInSeconds(Date.now(), new Date((m.date as number) * 1000)) < 300 &&
				!this.processed.includes(m.id),
		);

		// this.telegram.disconnect();
		return final.map((m) => ({ content: m.message, id: m.id }));
	}

	private async parseSignal() {
		console.log('parsing');
	}
}
