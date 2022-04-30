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
		console.log(this.summary + message?.toString());
	}

	public error(message: any): void {
		console.error(this.summary + message?.toString());
	}
}
