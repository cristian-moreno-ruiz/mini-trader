// // https://github.com/gram-js/gramjs

// import { TelegramClient } from 'telegram';
// import { StringSession } from 'telegram/sessions';

// const apiId = 19196895;
// const apiHash = '88f1ab0910e217553b4ee77636225f72';

// let resolveLinkPromise: any = (resolve) => resolve();

// export async function sendLoginCode(req): Promise<any> {
// 	const stringSession = new StringSession(''); // fill this later with the value from session.save()

// 	console.log('Loading interactive example...');
// 	const client = new TelegramClient(stringSession, apiId, apiHash, {
// 		connectionRetries: 5,
// 	});

// 	await client.start({
// 		// phoneNumber: req.body.number,
// 		// password: async () => await input.text('Please enter your password: '),
// 		phoneCode: async () =>
// 			await new Promise((resolve) => {
// 				resolveLinkPromise = resolve;
// 			}),
// 		onError: (err) => console.log(err),
// 	});

// 	// await client.sendCode({ apiId, apiHash }, '+50671262918');
// 	console.log('You should now be connected.');
// 	console.log(client.session.save()); // Save this string to avoid logging in again
// 	await client.sendMessage('me', { message: 'Hello!' });
// }

// export async function link(req): Promise<any> {
// 	if (!resolveLinkPromise) {
// 		throw 'Need to call sendLoginCode first';
// 	}

// 	resolveLinkPromise(req.body.code);
// 	resolveLinkPromise = undefined;
// }
