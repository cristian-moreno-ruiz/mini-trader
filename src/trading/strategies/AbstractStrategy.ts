export abstract class AbstractStrategy {
	public abstract trade(): Promise<void>;
	public abstract init(): Promise<void>;
}
