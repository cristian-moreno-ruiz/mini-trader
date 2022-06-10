import express from 'express';
import { getStats } from './stats';
// import { link, sendLoginCode } from './telegram';

const app = express();
const port = 1234; // default port to listen
app.use(express.json());
app.use((req, res, next) => {
	if (req.headers['api-key'] !== process.env.REST_API_KEY) {
		res.status(401).send('Invalid API key');
		return;
	}
	next();
});

// define a route handler for the default home page
app.get('/', (req, res) => {
	res.send('Hello world!');
});

app.get('/stats', async (req, res) => {
	const query = req.query;
	const stats = await getStats(query);
	res.json(stats);
});

// app.post('/telegram/sendLoginCode', async (req, res) => {
// 	const stats = await sendLoginCode(req);
// 	res.json(stats);
// });

// app.post('/telegram/link', async (req, res) => {
// 	const stats = await link(req);
// 	res.json(stats);
// });

export const init = () => {
	// start the Express server
	app.listen(port, () => {
		console.log(`server started at http://localhost:${port}`);
	});
};
