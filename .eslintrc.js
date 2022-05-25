module.exports = {
	env: {
		// TODO:
		// browser: true,
		// es2021: true,
		node: true,
	},
	extends: [
		'eslint:recommended',
		'plugin:@typescript-eslint/recommended',
		'plugin:prettier/recommended',
	],
	parser: '@typescript-eslint/parser',
	parserOptions: {
		ecmaVersion: 12,
		sourceType: 'module',
	},
	plugins: ['@typescript-eslint', 'prettier'],
	rules: {
		'comma-dangle': ['error', 'always-multiline'],
		indent: ['error', 'tab', { SwitchCase: 1 }],
		'linebreak-style': ['error', 'unix'],
		'quote-props': ['error', 'as-needed'],
		// quotes: ['error', 'single', 'as-needed'],
		semi: ['error', 'always'],
		// 'sort-keys': ['error', 'asc', { caseSensitive: true, minKeys: 2, natural: false }],
		'spaced-comment': ['warn', 'always'],
		'no-unused-vars': 'off',
		'@typescript-eslint/no-unused-vars': [
			'error',
			{ argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
		],
	},
};
