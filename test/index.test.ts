import { sayHello } from '../src';

describe('sayHello', () => {
	it('works with first', () => {
		sayHello({ first: 'Cristian', last: 'Moreno' });
	});
});
