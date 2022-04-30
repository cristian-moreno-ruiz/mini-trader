import { StrategyConfiguration } from './types';

export abstract class AbstractStrategy {
	private summary: string;
	public configuration: StrategyConfiguration | undefined;

	constructor(symbol: string) {
		this.summary = `[${symbol}] => `;
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
}
