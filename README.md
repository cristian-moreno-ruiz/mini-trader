# TypeScript Boilerplate

This is a basic template to start a TypeScript Project from scratch, with basic linting rules, prettier, and a basic Jest config to run tests.

## How to use

1. Clone the repo into your current directory `git clone git@github.com:cristian-moreno-ruiz/boilerplate-ts.git .`
2. Remove git references: `rm -rf .git`
3. `npm install`
4. Start coding in TS inside `src`.
5. You can run `git init` and commit your changes to a Git Repository.

## Proximos TODOS

- GenericStrategy implements abstract, all extend from it, it has a log and error method which prepends the symbol and leverage
- Implement Entry with "trailing stop" or similar 



## TODOs De hoy

<!-- - Arreglar Short
- Determinar bien como hacer stops -->

<!-- - Detect a previous STOP, and avoid re-entering for some hours (send alert later) -> Can be retriggered manually by jus restarting server -->
<!-- - Entradas en BTC y Ethereum -->
- Alerts??
- If position has been there more than 1 hour, override profitPercentage to 1% (just for one operation)

- Skip order (an order to buy / sell reduceonly reidiculous price (1/2 or x2))


### Statistics

- Duration of each operation
- PNL of each operation


- TOTAL profit per day per coin
- Total Fees
- Total closed ops
- Total Stops
- Total amount wasted and earned

- Number of times the trailing was advantageous, vs was perjudicial (and amount adv vs perj)