export const taapiMockSettings = {
	macd: [{ valueMACDHist: 0 }, { valueMACDHist: 0 }, { valueMACDHist: 0 }, { valueMACDHist: 0 }],
};

export const getIndicatorMock = jest.fn();
const mock = jest.fn().mockImplementation(() => {
	return {
		getIndicator: jest.fn().mockImplementation((indicator) => {
			let value;
			if (indicator === 'macd') {
				value = taapiMockSettings.macd;
			}

			return Promise.resolve(value);
		}),
	};
});

export const client = mock;
