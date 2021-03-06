import { Binance } from '../../providers/binance';
import { Taapi } from '../../providers/taapi';
import { AbstractStrategy } from './AbstractStrategy';
import safeEval from 'safe-eval';
import { CustomConfiguration, Mode } from './types';
import {
	CalculateInput,
	CreateOrderInput,
	FetchInputType,
	MultipleActionStageDefinition,
	SingleActionStageDefinition,
	Source,
	StageDefinition,
	StrategyDefinition,
} from './custom/types';
import * as Strategies from './custom';
import Mustache from 'mustache';
import { round } from '../../utils';
import { differenceInMinutes } from 'date-fns';

export const utils = {
	percentage: (value: number, percentage: number): number => {
		return (value * percentage) / 100;
	},
	percentageIncrease: (value: number, percentage: number): number => {
		return value * (1 + percentage / 100);
	},
	differenceInMinutes: differenceInMinutes,
};

export class Custom extends AbstractStrategy {
	public configuration: CustomConfiguration & StrategyDefinition;

	/**
	 * Sources
	 */
	private binance = new Binance();
	private taapi = new Taapi();

	private symbol: string;
	private pair: string;
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
	 * Built-in Variables Loaded at the beginning.
	 */
	private builtin: any = {};

	/**
	 * Variables Persisted during `store` stage.
	 */
	private storage: any = {};

	/**
	 * Variables Loaded during `fetch` stage.
	 */
	private variables: any = {};

	constructor(configuration: CustomConfiguration) {
		super(configuration);
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
		this.precision = await this.binance.getPrecision(this.pair, this.mode);
		this.pricePrecision = await this.binance.getPricePrecision(this.pair, this.mode);

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
				if (!this.evaluate(parsed)) {
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
	 * 		- fetch
	 * 		- persist
	 * 		- calculate
	 */

	public async fetch(input: FetchInputType): Promise<void> {
		const variables: FetchInputType[] = Array.isArray(input) ? input : [input];

		// TODO: Maybe here also render????

		for (const variable of variables) {
			const result = await this.request(variable.source, variable.data);
			if (variable.save) {
				this.variables[variable.save] = result;
			}
		}
		return;
	}

	public async persist(input: FetchInputType): Promise<void> {
		const variables: FetchInputType[] = Array.isArray(input) ? input : [input];

		for (const variable of variables) {
			const result = await this.request(variable.source, variable.data);
			if (variable.save) {
				this.storage[variable.save] = result;
			}
		}
		return;
	}

	public async calculate(input: CalculateInput): Promise<void> {
		const variables: CalculateInput[] = Array.isArray(input) ? input : [input];

		for (const variable of variables) {
			const rendered = await this.render(variable.data);
			if (variable.save) {
				this.variables[variable.save] = this.evaluate(rendered);
			}
		}
		return;
	}

	public async createOrderIfNotExists(args: CreateOrderInput): Promise<void> {
		if (args.price) {
			args.price = `${round(+args.price, this.pricePrecision)}`;
		}

		if (args.quantity) {
			args.quantity = `${Math.abs(round(+args.quantity, this.precision))}`;
		}

		let exists = false;
		if (args.type !== 'MARKET') {
			exists = this.builtin?.openOrders?.find(
				(order) =>
					+order.origQty === +(args.quantity as string) &&
					(+order.price === +(args.price as string) ||
						+order.stopPrice === +(args.price as string)) &&
					order.type === args.type &&
					order.side === args.side,
			);
		}

		if (exists) {
			return;
		}

		let reduceOnly;
		if (args.reduceOnly) {
			reduceOnly = '' + args.reduceOnly;
		}
		try {
			await this.binance.createOrder(
				this.pair,
				this.mode,
				args.side,
				args.quantity ? +args.quantity : undefined,
				args.price ? +args.price : undefined,
				args.type,
				reduceOnly,
				args.callback,
			);
		} catch (err) {
			const failedOrder = {
				quantity: args.quantity?.toString(),
				price: args.price,
				type: args.type,
				side: args.side,
			};
			const openOrders = this.builtin.openOrders.map((o) => ({
				quantity: o.quantity,
				price: o.price,
				stopPrice: o.stopPrice,
				type: o.type,
				side: o.side,
			}));

			console.error(
				`There was an error creating an order ${err}. Exists is ${exists}. The order is ${JSON.stringify(
					failedOrder,
				)}, and these are the open ones: ${JSON.stringify(openOrders)}`,
			);
		}

		await this.loadBuiltInVariables();
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
				if (params.length) {
					return this.binance[data.method](this.pair, this.mode, ...params);
				} else {
					return this.binance[data.method](this.pair, this.mode);
				}
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
	private evaluate(statement: string): unknown {
		if (!statement) {
			return false;
		}
		try {
			const context = {
				utils,
			};
			return safeEval(statement, context);
		} catch (err) {
			throw new Error(`Failed to evaluate statement: ${statement}. Error: ${err}`);
		}
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

		this.builtin = {
			configuration: this.configuration,
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
