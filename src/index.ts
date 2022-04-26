import 'dotenv/config';
import { execute } from './trading/engine';

async function trade() {
	console.log('Starting Mini Trader');
	await execute();
	console.log('Finishing for some reason');
}

trade();
