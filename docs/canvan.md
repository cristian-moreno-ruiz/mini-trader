## 1. BACKLOG

* TELEGRAM
	- Create a bot to allow having a conversation between Cristian and the bot?
	- Maybe, one strategy will be `forward` with a parse config, it will forward message to the bot
	- The bot then does the stuff and replies.
	- In this way we can add other commands to the bot like BE, close, etc
	- 
* Image recognition
	- https://stackoverflow.com/questions/40025271/extract-colored-text-out-of-image
	- https://github.com/desmondmorris/node-tesseract
	- Idea: Replace all non-relevant color with black, then parse with tesseract
	- ?? https://www.tensorflow.org/js/guide/nodejs

- Use trailing for TP macd
- Idea: When in my personal Chat, can send a message saying BE BTCUSDT, and it will move SL to BE.


## 2. SELECTED FOR DEVELOPMENT

- Stats improvement: 
	1. If no from/to, calculate last complete day
	2. Sorted profit: show symbol
	3. Accept a lastXdays param or something similar

## 3. IN PROGRESS
- ByBit API Integration
- Do a follow() function. It will increase TPs if new entry orders are filled for example. Also move SL to BE if needed (settings).


## 4. TESTING
- Telegram read last message

## 5. DONE
- Max stop orders limit reached bug
- TP1 and move SL to BE.
- Fix re-entries: When we enter o re-enter, we need to do something to avoid another one just in the next iteration (maybe just comparing the current `priceOnLastValley` && `priceOnLastPeak`)