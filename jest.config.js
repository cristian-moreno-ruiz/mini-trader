module.exports = {
	bail: true,
	collectCoverage: true,
	collectCoverageFrom: ['src/**/*.ts'],
	coveragePathIgnorePatterns: ['.d.ts'],
	coverageReporters: ['html', 'json', 'text-summary'],
	errorOnDeprecated: true,
	logHeapUsage: true,
	moduleFileExtensions: ['ts', 'js', 'json'],
	preset: 'ts-jest',
	verbose: false,
};
