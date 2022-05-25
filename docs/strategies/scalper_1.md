https://www.tradingview.com/script/sR1hePBi-Forex-Scalping-1min-Bollinger-Bands-RSI-and-ADX-Trading-System/
https://app.hercules.trading/

This is a Forex Scalping Trading Sytem based on the Bollinger Bands .
Its suited for major pairs, with lowest possible comission (below 1 pip) and with timeframes ranging between 1-15 min.

Indicators:
Bollinger bands
ADX
RSI


Rules for entry:
Long Entry: price to move below the upper Bollinger Bands RSI raise above the 30 line and ADX<32 at the same time.
Short Entry: price to move above the upper Bollinger Bands , RSI raise below the 70 line and ADX<32 at the same time.


Rules for exit
Profit Exit: 3 options: 1, exit position when the price touches the middle band, 2) when the price touches the opposite band, X pips target profit.
Loss Exit: X pips loss












// This source code is subject to the terms of the Mozilla Public License 2.0 at https://mozilla.org/MPL/2.0/
// © exlux99

//@version=4
strategy("Bollinger Bands, RSI and ADX Trading System", overlay=true)


timeinrange(res, sess) => time(res, sess) != 0


timer = color.red


//bgcolor(timeinrange(timeframe.period, "0300-0600") or timeinrange(timeframe.period, "0900-1300") or timeinrange(timeframe.period, "2030-2300") ? timer : na, transp=70)


//RSI
length = input( 20 )
overSold = input( 35 )
overBought = input( 65 )
price = close
vrsi = rsi(price, length)
co = crossover(vrsi, overSold)
cu = crossunder(vrsi, overBought)
//if (not na(vrsi))


//BB
lengthB = input(60, minval=1)
src = input(close, title="Source")
mult = input(2.0, minval=0.001, maxval=50, title="StdDev")
basis = sma(src, lengthB)
dev = mult * stdev(src, lengthB)
upper = basis + dev
lower = basis - dev


//adx
adxlen = input(14, title="ADX Smoothing")
dilen = input(14, title="DI Length")
dirmov(len) =>
	up = change(high)
	down = -change(low)
	plusDM = na(up) ? na : (up > down and up > 0 ? up : 0)
	minusDM = na(down) ? na : (down > up and down > 0 ? down : 0)
	truerange = rma(tr, len)
	plus = fixnan(100 * rma(plusDM, len) / truerange)
	minus = fixnan(100 * rma(minusDM, len) / truerange)
	[plus, minus]
adx(dilen, adxlen) =>
	[plus, minus] = dirmov(dilen)
	sum = plus + minus
	adx = 100 * rma(abs(plus - minus) / (sum == 0 ? 1 : sum), adxlen)
sig = adx(dilen, adxlen)

longEntry = close < upper and crossover(vrsi,overSold) and sig < 32 //and (timeinrange(timeframe.period, "0301-0600") or timeinrange(timeframe.period, "0901-1300") or timeinrange(timeframe.period, "2031-2300"))

shortEntry = close > upper and crossunder(vrsi,overBought) and sig < 32 //and (timeinrange(timeframe.period, "0301-0600") or timeinrange(timeframe.period, "0901-1300") or timeinrange(timeframe.period, "2031-2300"))


tp=input(90, step=10)
sl=input(90, step=10)

strategy.entry("long",1,when=longEntry)
strategy.exit("X_long", "long", profit=tp,  loss=sl )
strategy.close("long",when=crossunder(close,basis))

strategy.entry('short',0,when=shortEntry)
strategy.exit("x_short", "short",profit=tp, loss=sl)
strategy.close("short",when=crossover(close,basis))



