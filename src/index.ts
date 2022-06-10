import 'dotenv/config';
import { execute } from './trading/engine';
import { init } from './routes';

async function trade() {
	console.log('Starting Mini Trader');
	await execute();
	console.log('Finishing for some reason');
}

init();
trade();
