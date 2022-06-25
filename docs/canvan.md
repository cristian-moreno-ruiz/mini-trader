## 1. BACKLOG

* TELEGRAM
	- Create a bot to allow having a conversation between Cristian and the bot?
	- 
* Image recognition
	- https://stackoverflow.com/questions/40025271/extract-colored-text-out-of-image
	- https://github.com/desmondmorris/node-tesseract
	- Idea: Replace all non-relevant color with black, then parse with tesseract
	- ?? https://www.tensorflow.org/js/guide/nodejs


## 2. SELECTED FOR DEVELOPMENT

- Stats improvement: 
	1. If no from/to, calculate last complete day
	2. Sorted profit: show symbol
	3. Accept a lastXdays param or something similar

## 3. IN PROGRESS
- ByBit API Integration


## 4. TESTING
- Telegram read last message

## 5. DONE
- Max stop orders limit reached bug
- TP1 and move SL to BE.
- Fix re-entries: When we enter o re-enter, we need to do something to avoid another one just in the next iteration (maybe just comparing the current `priceOnLastValley` && `priceOnLastPeak`)