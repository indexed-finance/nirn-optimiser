// Enter the private key for your wallet here, without the leading 0x.
// The .gitignore is set up so that you *probably* won't end up accidentally uploading this to GitHub if you fork it but *please* be careful.
// It goes without saying, but you'll need some ETH in here to actually trigger a reweighting.
export const PRIVATE_KEY = '{PRIVATE_KEY_HERE_PLEASE_KEEP_IT_SAFE}';

// Enter your Infura API key here.
// You need this to query on-chain data and submit a reweight if one is found.
// Guide: https://medium.com/jelly-market/how-to-get-infura-api-key-e7d552dd396f
export const INFURA_KEY = '{INFURA_API_KEY_HERE}';

// Enter the token addresses for the underlyings you want to optimise vaults for.
// For example, 0x6b3595068778dd592e39a122f4f5a5cf09c90fe2 is the address for SUSHI.
// https://etherscan.io/address/0x6b3595068778dd592e39a122f4f5a5cf09c90fe2
export const UNDERLYING_LIST = [
    '0x6b3595068778dd592e39a122f4f5a5cf09c90fe2',
    '0xdac17f958d2ee523a2206206994597c13d831ec7',
    '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
    '0x6b175474e89094c44da98b954eedeac495271d0f',
    '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9'
]

// Enter the maximum reserve ratio offset at which point you wish to retrigger a rebalance
// (i.e. if you wish to trigger a deposit or withdrawal to/from the underlying protocols if the difference
//       between the current and desired reserve ratio is at least 25%, enter 0.25).
export const RATIO_OFFSET = 0.25;

// Enter the maximum gas price (in gwei) that you're willing to accept paying for a rebalance to be executed.
export const MAX_GAS = 20;