import { Binance } from '../../providers/binance';
import { Taapi } from '../../providers/taapi';
import { AbstractStrategy } from './AbstractStrategy';
import { CustomConfiguration, Mode } from './types';
import {
	LoadInputType,
	MultipleActionStageDefinition,
	SingleActionStageDefinition,
	Source,
	StageDefinition,
	StrategyDefinition,
} from './custom/types';
import * as Strategies from './custom';
import Mustache from 'mustache';

export class Custom extends AbstractStrategy {
	public configuration: CustomConfiguration & StrategyDefinition;

	/**
	 * Sources
	 */
	private binance = new Binance();
	private taapi = new Taapi();

	private symbol: string;
	private reference: string;
	private mode: Mode;
	private precision = 0;
	private pricePrecision = 3;
	private stop = false;
	// private pendingOrders: any[] = [];
	// private stopLossIsNextSent = false;
	private notificationsSent = {
		positionIsNowOpen: false,
	};

	/**
	 * Variables Loaded during `load` stage.
	 */
	private builtin: any = {};

	/**
	 * Variables Persisted during `store` stage.
	 */
	private storage: any = {};

	/**
	 * Variables Loaded during `load` stage.
	 */
	private variables: any = {};

	constructor(configuration: CustomConfiguration) {
		super(configuration.symbol);
		const strategy = Strategies[configuration.name];

		if (!strategy) {
			throw new Error(`Strategy ${configuration.name} not found.`);
		}
		this.configuration = { ...configuration, ...strategy };
		this.symbol = this.configuration.symbol.split('/')[0];
		this.reference = this.configuration.symbol.split('/')[1];
		this.pair = `${this.symbol}${this.reference}`;
		this.mode = this.configuration.mode;
	}

	public async init(): Promise<void> {
		await this.binance.setIsolatedLeverage(this.pair, this.configuration.leverage);
		return;
	}

	public async trade(): Promise<boolean> {
		await this.loadBuiltInVariables();

		// 1. Reset variables
		this.variables = {};

		const stages = this.configuration.stages;

		await this.execute(stages);
		return true;
	}

	/**
	 * Iterates through each defined Stage.
	 */
	public async execute(stages: StageDefinition[]): Promise<void> {
		for (const current of stages) {
			if (current.condition) {
				const parsed = this.render(current.condition);
				if (!this.evaluateCondition(parsed)) {
					continue;
				}
			}
			if (current.name) {
				this.log(`Executing action: ${current.name}`);
			}

			let input;
			if (current.input) {
				input = this.render(current.input);
			}
			if ((current as SingleActionStageDefinition).action) {
				await this[(current as SingleActionStageDefinition).action](input);
			} else if ((current as MultipleActionStageDefinition).actions) {
				await this.execute((current as MultipleActionStageDefinition).actions);
			}
		}
	}

	/**
	 * POSSIBLE ACTIONS:
	 * 		- log
	 * 		- sendNotification
	 * 		- load
	 * 		- persist
	 */

	public async load(input: LoadInputType): Promise<void> {
		const variables = Array.isArray(input) ? input : [input];

		for (const variable of variables) {
			this.variables[variable.name] = await this.request(variable.source, variable.data);
		}
		return;
	}

	public async persist(input: LoadInputType): Promise<void> {
		const variables = Array.isArray(input) ? input : [input];

		for (const variable of variables) {
			this.storage[variable.name] = await this.request(variable.source, variable.data);
		}
		return;
	}

	/**
	 * Internal Helpers.
	 * These methods are not intended to be called by the Strategy templates, but are instead
	 * helpers for completing the public methods functionality.
	 */

	private async request(source: Source, data: any): Promise<any> {
		switch (source) {
			case 'local': {
				return this.render(data);
			}
			case 'binance': {
				const params = !Array.isArray(data.params) ? [data.params] : data.params;
				return this.binance[data.method](this.pair, this.mode, ...params);
			}
			case 'taapi': {
				return this.taapi.getIndicator(
					data.indicator,
					this.pair,
					this.configuration.interval,
					data.params,
				);
			}
		}
	}

	/**
	 * Evaluates a piece of code using `eval`.
	 */
	private evaluateCondition(condition: string): Promise<boolean> {
		return eval(condition);
	}

	/**
	 * Renders a template using Mustache.
	 */
	private render(input: any): any {
		let template: string;
		if (typeof input === 'string') {
			template = input;
		} else {
			template = JSON.stringify(input);
		}

		const view = {
			...this.builtin,
			...this.storage,
			...this.variables,
		};
		const rendered = Mustache.render(template, view);

		try {
			const parsed = JSON.parse(rendered);
			return parsed;
		} catch {
			return rendered;
		}
	}

	/**
	 * Load some of the built-in variables.
	 */
	private async loadBuiltInVariables(): Promise<void> {
		const currentPrice = await this.binance.getCurrentPrice(this.pair, this.mode);
		const currentPosition = await this.binance.getCurrentPosition(this.pair, this.mode);
		const openOrders = await this.binance.getCurrentOrders(this.pair, this.mode);

		this.precision = await this.binance.getPrecision(this.pair, this.mode);
		this.pricePrecision = await this.binance.getPricePrecision(this.pair, this.mode);

		this.builtin = {
			symbol: this.symbol,
			reference: this.reference,
			mode: this.mode,
			precision: this.precision,
			pricePrecision: this.pricePrecision,
			currentPrice,
			currentPosition,
			openOrders,
		};
	}
}
