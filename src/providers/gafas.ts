import axios from 'axios';

export class Gafas {
	public async getSetup({
		posicion,
		recompra,
		monedasx,
		stoploss,
		entrada,
		monedas,
	}): Promise<any> {
		const data = `posicion=${posicion.toLowerCase()}&recompra=${recompra}&monedasx=${monedasx}&stoploss=${stoploss}&entrada=${entrada}&monedas=${monedas}`;
		// const data = 'posicion=short&recompra=2&monedasx=40&stoploss=5&entrada=0.6503&monedas=8';
		const response = await axios.post('http://elgafas.com/calculo.php', data, {
			headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
		});
		return response.data;
	}
}
