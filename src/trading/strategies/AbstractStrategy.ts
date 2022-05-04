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
		if (typeof message === 'object' || !Array.isArray(message)) {
			console.log(this.summary + JSON.stringify(message));
		} else {
			console.log(this.summary + message?.toString());
		}
	}

	public error(message: any): void {
		if (typeof message === 'object' || !Array.isArray(message)) {
			console.error(this.summary + JSON.stringify(message));
		} else {
			console.error(this.summary + message?.toString());
		}
	}

	public async sendNotification(message: string): Promise<void> {
		if (typeof message === 'object' || !Array.isArray(message)) {
			await this.slack.sendMessage(this.summary + JSON.stringify(message));
		} else {
			await this.slack.sendMessage(this.summary + message?.toString());
		}
	}
}
