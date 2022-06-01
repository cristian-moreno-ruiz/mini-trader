export interface StrategyDefinition {
	description: string;
	stages: StageDefinition[];
}

export type StageDefinition =
	| FetchStageDefinition
	| SingleActionStageDefinition
	| CalculateStageDefinition
	| CreateOrderStageDefinition
	| MultipleActionStageDefinition;

interface AbstractStageDefinition {
	name?: string;
	condition?: string;
}

/**
 * Action types:
 * 	- fetch
 * 	- persist
 */
interface FetchStageDefinition extends AbstractStageDefinition {
	action: 'fetch' | 'persist';
	input: FetchInputType | FetchInputType[];
}

export type FetchInputType = FetchBinanceInput | FetchTaapiInput | FetchLocalInput;

interface FetchInput {
	save?: string;
}

interface FetchBinanceInput extends FetchInput {
	source: 'binance';
	data: {
		// TODO: More concrete
		method: string;
		params?: any[];
	};
}

interface FetchTaapiInput extends FetchInput {
	source: 'taapi';
	data: {
		indicator: string;
		params: Record<string, string | number>;
	};
}

interface FetchLocalInput extends FetchInput {
	source: 'local';
	data: string | number | boolean | Record<string, string | number> | any[];
}

/**
 * Action types:
 * 	- calculate
 */
export interface CalculateInput {
	// source? TODO:
	save: string;
	data: string;
}

interface CalculateStageDefinition extends AbstractStageDefinition {
	action: 'calculate';
	input: CalculateInput | CalculateInput[];
}

/**
 * Action types:
 * 	- createOrderIfNotExists
 */
interface CreateOrderStageDefinition extends AbstractStageDefinition {
	action: 'createOrderIfNotExists';
	input: CreateOrderInput;
}

export interface CreateOrderInput {
	side: 'BUY' | 'SELL';
	quantity?: string | number;
	price?: string | number;
	type: 'LIMIT' | 'MARKET' | 'STOP_MARKET';
	reduceOnly?: boolean;
	callback?: number;
}

/**
 * Action Types:
 * 	- log
 * 	- sendNotification
 */
interface ExecuteStageDefinition extends AbstractStageDefinition {
	input?: string | number | boolean | Record<string, string | number> | any[];
}

export interface SingleActionStageDefinition extends ExecuteStageDefinition {
	action: 'log' | 'sendNotification';
}

export interface MultipleActionStageDefinition extends ExecuteStageDefinition {
	actions: StageDefinition[];
}

export type Source = 'binance' | 'taapi' | 'local';
