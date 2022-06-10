// import { bin } from 'd3-array';
import * as d3 from 'd3-array';

import { Binance } from '../../providers/binance';
import { round } from '../../utils';

const binance = new Binance();

export async function getStats(query): Promise<any> {
	const income = await binance.getIncomeHistory(
		query.symbol,
		query.mode,
		{ start: new Date(query.from), end: new Date(query.to) },
		'REALIZED_PNL',
	);

	const allTransactions = await binance.getIncomeHistory(query.symbol, query.mode, {
		start: new Date(query.from),
		end: new Date(query.to),
	});

	const totalFees = allTransactions.reduce((acc, cur) => {
		if (cur.incomeType !== 'REALIZED_PNL') {
			return acc + +cur.income;
		}
		return acc;
	}, 0);

	let numberOfWins = 0;
	let numberOfLosses = 0;
	let maxWin = 0;
	let maxLoss = 0;
	let totalWon = 0;
	let totalLost = 0;

	const profits: number[] = [];
	income.forEach((i) => {
		profits.push(+i.income);
		if (i.income > 0) {
			numberOfWins++;
			totalWon += +i.income;
			maxWin = Math.max(maxWin, +i.income);
		} else {
			numberOfLosses++;
			totalLost += +i.income;
			maxLoss = Math.min(maxLoss, +i.income);
		}
	});

	const histogram = d3.bin().thresholds(20)(profits);
	const histogramSummary = histogram.map(
		(bin) =>
			`${new Array(bin.length + 1).join('*')} -> [${round(bin.x0 as number, 3)}, ${round(
				bin.x1 as number,
				3,
			)}]: (${bin.length})`,
	);

	const sortedProfit = income.sort((a, b) => +a.income - +b.income);
	const profitSummary = sortedProfit.map((p) => p.income);

	// TODO: Current picture (open trades/orders and which strategy is enabled or disabled)

	// TODO:
	// const currentBalance = {
	// 	BUSD: {
	// 		FREE: 0,
	// 		POSITION: 0,
	// 		IN_ORDER: 0,
	// 	},
	// 	USDT: {
	// 		FREE: 0,
	// 		POSITION: 0,
	// 		IN_ORDER: 0,
	// 	},
	// };

	return {
		numberOfTrades: income.length,
		numberOfWins,
		percentageOfWins: (numberOfWins / income.length) * 100,
		numberOfLosses,
		percentageOfLosses: (numberOfLosses / income.length) * 100,
		maxWin,
		maxLoss,
		totalWon,
		totalLost,
		netProfit: totalWon + totalLost,
		totalFees,
		histogram: histogramSummary,
		sortedProfit: profitSummary,
		// pnl,
		// fees,
		// currentBalance,
	};
}
