import { Slack } from '../../providers/slack';
import { StrategyConfiguration } from './types';

export abstract class AbstractStrategy {
	private summary: string;
	private slack = new Slack();
	public configuration: StrategyConfiguration | undefined;

	constructor(public pair: string) {
		this.summary = `[${pair}] => `;
	}

	public abstract trade(): Promise<boolean>;

	public abstract init(): Promise<void>;

	public log(message: any): void {
		console.log(this.buildMessage(message));
	}

	public error(message: any): void {
		console.error(this.buildMessage(message));
	}

	public async sendNotification(message: string): Promise<void> {
		await this.slack.sendMessage(this.buildMessage(message));
	}

	private buildMessage(message: any): string {
		if (typeof message === 'string') {
			return this.summary + message;
		} else if (typeof message === 'object' || !Array.isArray(message)) {
			return this.summary + JSON.stringify(message);
		} else {
			return this.summary + message?.toString();
		}
	}
}
