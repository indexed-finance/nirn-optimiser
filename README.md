# nirn-optimiser

Script for detecting and adjusting weightings of Nirn yield aggregator vaults.

*Last Update: 8 August 2021*

## Current Status

This is *very* simple at present, and simply pushes funds across protocols to where the yield is best.

This can - and will - get more sophisticated as time goes on. At _current_ TVLs, it is HUGELY unlikely to be optimal to split assets across protocols, except to flex that we *can*.

If you feel like refactoring this to improve my... middling Typescript, PRs are welcomed.

## Prerequisites

`yarn` (through `npm`: https://classic.yarnpkg.com/en/docs/install)

## Setup

Run `yarn install` in the main directory.

Put these three things in env_vars.ts:

* The `PRIVATE_KEY` (sans leading 0x) for the wallet that you want to execute a reweight from,
* The `INFURA_KEY` that allows you read on-chain data and submit the reweight via their API, and
* The `UNDERLYING_LIST` of token addresses for the vaults: if you're optimising the nUSDT and nSUSHI vault, use the USDT and SUSHI addresses.

If you don't have an Infura API key, here's how to get one: https://medium.com/jelly-market/how-to-get-infura-api-key-e7d552dd396f

PLEASE be careful with your private key. _Don't_ clone this repo and then accidentally push it up.

## Execution

`ts-node optimise_vault.ts`

That's it. It'll tell you if there are any hang-ups, and if not, it'll execute any reweighs it detects for you.

Make sure you have a 'decent' amount of ETH in the wallet you're executing from: errors are not refined in the event of a transaction failure due to insufficient gas, so if it bugs out, that's probably why.

## In Action

Targeting the nDAI vault, shifting funds from the Iron Bank & Fulcrum to C.R.E.A.M.:

![image](https://user-images.githubusercontent.com/36096924/128636597-0edd1005-f03d-4709-9799-92d82345fb87.png)

Result: https://etherscan.io/tx/0x68dd085584a2c2660482258a74172c992e0ace7c70aa282e21e1bfa37d91e638

Account has no whitelisted permissions within Nirn: you can do this too.

## Currently Active Vaults

https://docs.indexed.finance/yield-aggregator-smart-contracts/deployments#asset-vaults

## FAQ

### Why Don't You Just Ask For Vault Addresses In `env_var.ts`?

We need the address of the underlying to query the adapter registry for the currently supported adapters.

I'll fix this in a future version so you can just get away with entering the vault address directly.

## Got Questions?

Hop into the Indexed Finance Discord and ask! http://discord.indexed.finance
