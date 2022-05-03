import { settings, strategies } from '../configuration';
import { AbstractStrategy } from './strategies/AbstractStrategy';
import { BuyLowSellHigh } from './strategies/BuyLowSellHigh';
import { MartinGala } from './strategies/MartinGala';

const engines: Record<string, new (_) => AbstractStrategy> = {
	BuyLowSellHigh,
	MartinGala,
};

export async function execute(): Promise<void> {
	const strats = strategies.map((strat) => new engines[strat.strategy](strat));

	const promises = strats.map(async (strategy) => {
		const summary = `${strategy.configuration?.strategy}-${strategy.configuration?.symbol}`;
		await strategy.init();
		console.log(`Initiating trade using ${summary}`);

		let next = await strategy.trade();
		while (next === true) {
			try {
				await new Promise((res) => setTimeout(res, settings.sleep * 1000));
				next = await strategy.trade();
				strategy.log(`. ${settings.sleep}s . `);
			} catch (err) {
				strategy.error(err);
			}
		}
	});

	await Promise.all(promises);
	console.log('We are done, Bye');
}
