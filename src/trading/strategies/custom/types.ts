export interface StrategyDefinition {
	description: string;
	stages: StageDefinition[];
}

export type StageDefinition =
	| LoadStageDefinition
	| SingleActionStageDefinition
	| MultipleActionStageDefinition;

interface AbstractStageDefinition {
	name?: string;
	condition?: string;
}

/**
 * Action types:
 * 	- load
 * 	- persist
 */
interface LoadStageDefinition extends AbstractStageDefinition {
	action: 'load' | 'persist';
	input: LoadInputType | LoadInputType[];
}

export type LoadInputType = LoadBinanceInput | LoadTaapiInput | LoadLocalInput;

interface LoadInput {
	name: string;
}

interface LoadBinanceInput extends LoadInput {
	source: 'binance';
	data: {
		// TODO: More concrete
		method: string;
		params: any[];
	};
}

interface LoadTaapiInput extends LoadInput {
	source: 'taapi';
	data: {
		indicator: string;
		params: Record<string, string | number>;
	};
}

interface LoadLocalInput extends LoadInput {
	source: 'local';
	data: string | number | boolean | Record<string, string | number> | any[];
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
