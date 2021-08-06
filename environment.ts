// Enter the private key for your wallet here, without the leading 0x.
// The .gitignore is set up so that you *probably* won't end up accidentally uploading this to GitHub if you fork it but *please* be careful.
// It goes without saying, but you'll need some ETH in here to actually trigger a reweighting.
export const PRIVATE_KEY = '{PRIVATE_KEY_HERE_PLEASE_KEEP_IT_SAFE}';

// Enter your Infura API key here.
// You need this to query on-chain data and submit a reweight if one is found.
// Guide: https://medium.com/jelly-market/how-to-get-infura-api-key-e7d552dd396f
export const INFURA_KEY = '{INFURA_API_KEY_HERE}';

// Enter the token address for the underlying you want to optimise the vault for.
// As an example, this is the address for USDT.
// https://etherscan.io/address/0xdac17f958d2ee523a2206206994597c13d831ec7
export const UNDERLYING = '0xdac17f958d2ee523a2206206994597c13d831ec7'