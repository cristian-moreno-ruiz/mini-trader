import { configuration } from '../configuration';
import { AbstractStrategy } from './strategies/AbstractStrategy';
import { BuyLowSellHigh } from './strategies/BuyLowSellHigh';

const strategies: Record<string, AbstractStrategy> = {
	BuyLowSellHigh: new BuyLowSellHigh(),
};

export async function execute() {
	const strategy = strategies[configuration.strategy];

	console.log(`Initiating trade using ${configuration.strategy} strategy`);
	await strategy.init();

	// TODO: Use better CLI wrapper ??
	// eslint-disable-next-line no-constant-condition
	while (true) {
		await strategy.trade().catch(async (err) => {
			console.log(err);
			await strategy.trade();
		});

		// console.log(`Next check is in ${configuration.tick} seconds.`);
		process.stdout.write(`. ${configuration.tick}s . `);
		await new Promise((res) => setTimeout(res, configuration.tick * 1000));
	}
}
