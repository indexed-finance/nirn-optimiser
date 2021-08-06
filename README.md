# nirn-optimiser

Script for detecting and adjusting weightings of Nirn yield aggregator vaults.

*Last Update: 6 August 2021*

## Current Status

This is *very* simple at present, and simply pushes funds across protocols where the yield is best.

It can - and will - get more sophisticated as time goes on. At current TVLs, it is HUGELY unlikely to be optimal to split protocol allocations.

## Prerequisites

`yarn` (through `npm`: https://classic.yarnpkg.com/en/docs/install)

## Setup

Run `yarn install` in the main directory.

Put these three things in env_vars.ts:

* The private key (sans leading 0x) for the wallet that you want to execute a reweight from,
* Your Infura API key to read on-chain data and submit the reweight
* The address of the _underlying token_ of the vault: if you're optimising the nUSDT vault, enter the USDT address.

If you don't have an Infura API key, here's how to get one: https://medium.com/jelly-market/how-to-get-infura-api-key-e7d552dd396f

PLEASE be careful with your private key. Don't clone this repo and then accidentally push it up.

## Execution

`ts-node optimise_vault.ts`

That's it. It'll tell you if there are any hang-ups, and if not, it'll execute it for you.

Make sure you have a 'decent' amount of ETH in the wallet you're executing from: errors are not refined in the event of a transaction failure due to insufficient gas, so if it bugs out, that's probably why.

## In Action

Targeting the nWBTC vault, shifting funds from Fulcrum to C.R.E.A.M.

![image](https://user-images.githubusercontent.com/36096924/128519317-a99f98c9-b08f-406d-994e-fb4dd39fcd73.png)

Result: https://etherscan.io/tx/0x29825ade33e7705cd7a6c4962c48c16a4fbd4ea79c1c51cdfdc7d537984f990a

Account has no whitelisted permissions within Nirn: you can do this too.

## Got Questions?

Hop into the Indexed Finance Discord and ask! http://discord.indexed.finance
