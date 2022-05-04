import axios from 'axios';

export class Slack {
	private url?: string;
	constructor() {
		this.url = process.env.SLACK_WEBHOOK_URL;
	}

	public async sendMessage(message: string): Promise<void> {
		if (!this.url) {
			return;
		}

		const payload = {
			text: message,
		};

		await axios.post(this.url, payload, { headers: { 'Content-Type': 'application/json' } });
	}
}
