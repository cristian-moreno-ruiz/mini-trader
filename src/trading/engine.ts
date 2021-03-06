import { settings, strategies } from '../configuration';
import { Slack } from '../providers/slack';
import { AbstractStrategy } from './strategies/AbstractStrategy';
import { Bollinger } from './strategies/Bollinger';
import { BuyLowSellHigh } from './strategies/BuyLowSellHigh';
import { Custom } from './strategies/CustomStrategy';
import { MartinGala } from './strategies/MartinGala';
import { Signals } from './strategies/Signals';

const engines: Record<string, new (_) => AbstractStrategy> = {
	BuyLowSellHigh,
	MartinGala,
	Bollinger,
	Custom,
	Signals,
};

const slack = new Slack();

export async function execute(): Promise<void> {
	const strats = strategies.map((strat) => new engines[strat.strategy](strat));
	await slack.sendMessage(
		`Starting ${strats.length} trades: ${strats
			.map((strat) => `${strat.configuration.symbol} (${strat.configuration?.strategy})`)
			.join(', ')}`,
	);

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
