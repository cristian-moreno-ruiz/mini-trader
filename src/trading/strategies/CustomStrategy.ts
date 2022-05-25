import { Binance } from '../../providers/binance';
import { Taapi } from '../../providers/taapi';
import { AbstractStrategy } from './AbstractStrategy';
import { CustomConfiguration, Mode, Source } from './types';
import * as Strategies from './custom';
import Mustache from 'mustache';

export class Custom extends AbstractStrategy {
	public configuration: CustomConfiguration;

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

		for (const stage of stages) {
			await this[stage.type](stage);
		}

		return true;
	}

	/**
	 * STAGES:
	 * 		- load
	 * 		- execute
	 */

	public async load(stage: any): Promise<void> {
		const variables: any[] = stage.variables;
		for (const variable of variables) {
			this.variables[variable.name] = await this.request(variable.source, variable.input);
		}
		return;
	}

	public async execute(stage: any): Promise<void> {
		const actions: any[] = stage.actions;
		for (const current of actions) {
			if (current.condition) {
				if (!this.evaluateCondition(current.condition)) {
					continue;
				}
			}
			if (current.name) {
				this.log(`Executing action: ${current.name}`);
			}
			// TODO: Replace use of eval with something like <%%.*%%>.
			// TODO: Add support for multiple inputs (using objects & arrays)
			// const input = this.render(current.input);
			let input;
			if (current.input) {
				input = this.render(current.input);
			}
			if (current.action) {
				await this[current.action](input);
			} else if (current.actions) {
				await this.execute(current);
			}
		}
	}

	/**
	 * Internal Helpers.
	 */

	private async request(source: Source, input: any): Promise<any> {
		switch (source) {
			case 'local': {
				return input;
			}
			case 'binance': {
				const params = !Array.isArray(input.params) ? [input.params] : input.params;
				return this.binance[input.method](this.pair, this.mode, ...params);
			}
			case 'taapi': {
				return this.taapi.getIndicator(
					input.indicator,
					this.pair,
					this.configuration.interval,
					input.params,
				);
			}
		}
	}

	private evaluateCondition(condition: string): Promise<boolean> {
		return eval(condition);
	}

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
		// // TODO: If strigify works, use it and return it as an object.
		// return rendered;
	}

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
