import { StrategyConfiguration } from './types';

export abstract class AbstractStrategy {
	public configuration: StrategyConfiguration | undefined;
	public abstract trade(): Promise<boolean>;
	public abstract init(): Promise<void>;
}
