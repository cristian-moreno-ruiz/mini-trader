export const round = (value: number, decimals: number) => {
	if (!value) {
		return 0;
	}
	return Math.round((value + Number.EPSILON) * Math.pow(10, decimals)) / Math.pow(10, decimals);
};
