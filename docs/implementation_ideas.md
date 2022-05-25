# Implement helpers that can be used in a calculate or execute stage

1. Calculate Stop Loss
	- Accept a method (fixed percentage, ATR, ADX, Swing Low/High)
	- Accept config for given method (maybe we need a maximum also)
2. Calculate TP
	- Similar to previous
3. Implement TP (TP1 + SL to BE, TP2 + SL to TP1, etc)