import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';

const sessionId = process.env.TELEGRAM_USER_SESSION;
const apiId = +(process.env.TELEGRAM_API_ID as string);
const apiHash = process.env.TELEGRAM_API_HASH;
let client: TelegramClient;

export const getClient = (): TelegramClient => {
	if (client) {
		return client;
	}

	if (sessionId && apiId && apiHash) {
		const stringSession = new StringSession(sessionId);

		client = new TelegramClient(stringSession, apiId, apiHash, {
			connectionRetries: 5,
		});

		return client;
	}

	throw 'No active Telegram session';
};
