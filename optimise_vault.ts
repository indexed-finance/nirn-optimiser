/**

Nirn Vault Optimiser: Version 0.1

I'm not writing a license blurb for this. Do what you want with it.

**/

import { InfuraProvider } from '@ethersproject/providers';
import { Contract } from '@ethersproject/contracts';
import { Wallet } from '@ethersproject/wallet';
import { NirnSubgraphClient } from '@indexed-finance/subgraph-clients'
import { TokenAdapter } from "@indexed-finance/subgraph-clients/dist/nirn/types";

import { PRIVATE_KEY, INFURA_KEY, UNDERLYING_LIST, MAX_GAS } from './env_vars';

// -------------------
// Top-Level Variables
// -------------------

const provider = new InfuraProvider('mainnet', INFURA_KEY);

const weight_unity = 1000000000000000000;

const key = Buffer.from(PRIVATE_KEY, 'hex');
const wallet = new Wallet(key, provider);

const adapter_registry_addr = '0x5F2945604013Ee9f80aE2eDDb384462B681859C4';
const null_addr = '0x0000000000000000000000000000000000000000'

const AdapterRegistryABI = require('./optimiser-deployments/AdapterRegistry.json');
const VaultABI = require('./optimiser-deployments/NirnVault.json');
const AdapterABI = require('./optimiser-deployments/TokenAdapter.json'); // this only contains an ABI for name right now

let adapter_registry: Contract;
let nirn_vault: Contract;
let token_adapter: Contract;

let getAdapterProtocolName: (address: string) => string;

// -------------------
// Auxiliary Functions
// -------------------

function zip(a, b) {
    return a.map((k, i) => [k, b[i]]);
}

function round2(n) {
    return Math.round(n * 100)/100;
}

function toAPR(n) {
    return n/weight_unity * 100;
}

function calculate_current_apr(ad_lst, cr_ad_map, av_ad_map) {
    let totalAPR: number = 0;

    for (let ix in ad_lst) {
        const ad = ad_lst[ix];

        const ad_wt = cr_ad_map.get(ad);
        const ad_apr = av_ad_map.get(ad)[0];

        totalAPR += (ad_apr / weight_unity) * ad_wt;
    }
    return totalAPR;
}

// --------------------------
// Protocol Name Lookup Table
// --------------------------------

async function getAdapterMetadataLookup() {
  const adaptersList = await NirnSubgraphClient.forNetwork('mainnet').allTokenAdapters()
  const lookupTable: Record<string, TokenAdapter> = adaptersList.reduce((prev, next) => ({
    ...prev,
    [next.id]: next
  }), {});
  const getAdapterProtocolName = (adapterAddress: string) => lookupTable[adapterAddress.toLowerCase()].protocol.name
  return {
    lookupTable,
    adaptersList,
    getAdapterProtocolName
  };
}

// --------------------------
// On-Chain Interaction Setup
// --------------------------

async function setup_registry() {
    adapter_registry = new Contract(adapter_registry_addr, AdapterRegistryABI, wallet);
  }

async function setup_vault(vault_addr) {
    nirn_vault = new Contract(vault_addr, VaultABI, wallet);
  }

async function setup_token_adapter(adapter_addr) {
    token_adapter = new Contract(adapter_addr, AdapterABI, wallet);
  }

// --------------------
// The Actual Optimiser
// --------------------


async function execute(underlying, gasPrice) {

    // Administrative, fetching names and what have you
    await setup_registry();
    const vault = await adapter_registry.vaultsByUnderlying(underlying);
    await setup_vault(vault);
    const vault_underlying = await nirn_vault.name();
    console.log(`\nTargeted vault is %s, at address %s`, vault_underlying, vault);

    // Find current weightings of the vault to determine existing APR
    const current_adapters_weights = await nirn_vault.getAdaptersAndWeights();

    const current_adapters = current_adapters_weights[0];
    const current_weights = current_adapters_weights[1].map(a => Number(a));
    const current_adapter_map = new Map<String, Number>(zip(current_adapters, current_weights));

    const combined_current = zip(current_adapters, current_weights);
    console.log(`\nCurrent adapter weightings:`);
    console.log(combined_current);

    // Get sorted list of adapters, their names and APRs for current deposit levels for the given vault
    const sorted_adapters = await adapter_registry.getAdaptersSortedByAPRWithDeposit(underlying, 0, null_addr);
    const sorted_adapter_names = sorted_adapters[0].map(a => getAdapterProtocolName(a));

    const sorted_adapter_map = new Map<String,[Number,String]>(zip(sorted_adapters[0]
                                                             , zip(sorted_adapters[1].map(a => Number(a)), sorted_adapter_names))
                                                              );
    console.log(`\nAvailable adapter rates at current levels:`);
    console.log(sorted_adapter_map);

    /** OPTIMISER VERSION 1.2: SLIGHTLY LESS NAIVE (CALCULATES CURRENT APR FROM ON-CHAIN DATA)
    /
    / Step 1: Is there only one adapter registered to the vault?
    /   * Yes: the hell are you trying to optimise, then? Begone. BREAK;
    /   * No:  move on.
    / Step 2: Is the difference between the highest available adapter and the current one at least 5%?
    /   * Yes: you have a reweight opportunity!
    /   * No:  nothing to do. BREAK;
    / Step 3: Has at least an hour passed since the last weight/adapter-shifting rebalance?
    /   * Yes: the reweight will be accepted.
    /   * No:  you have to wait a bit. BREAK;
    / Step 4: Is the current gas on the network less than your specified maximum?
    /   * Yes: AAAAA STOP STALLING AND SEND IT
    /   * No:  don't send the reweight: perhaps keep this running in a loop via `tmux` or `screen`? BREAK;
    / Step 5: ???
    / Step 6: Profit!
    /
    / Note: The optimiser does *not* yet count for APR shifts when moving capital between adapters.
    /
    **/

    const current_adapter = current_adapters[0]
    const best_adapter = sorted_adapters[0][0]

    const adapter_name = await getAdapterProtocolName(current_adapter);

    let name_of_current: string;
    if ( current_adapters.length > 1 ) { name_of_current = "a mixture of adapters" } else { name_of_current = adapter_name }

    const current_adapter_rate = calculate_current_apr(current_adapters, current_adapter_map, sorted_adapter_map);
    const best_single_adapter_rate = sorted_adapter_map.get(best_adapter)[0];

    console.log(`\n*** Current adapter rate is %d%, via %s.`
              , round2(toAPR(current_adapter_rate))
              , name_of_current);

    const multiple_potential_adapters = sorted_adapter_map.size > 1;

    if (!multiple_potential_adapters) {
      console.log(`\nOptimiser complete: only one available adapter for the vault.`);
    }
    else {
      const adapter_difference = Number(best_single_adapter_rate) / Number(current_adapter_rate);

      if (adapter_difference == 1) {
          console.log(`\nOptimiser complete: currently using best adapter rate.`);
      }
      else {
        if (adapter_difference < 1.05) {
          console.log(`\nOptimiser complete: insufficient percentage gain for reweighting - need at least 1.05x, got %sx.`
                    , round2(adapter_difference));
        }
        else {
          const time_to_rebalance = await nirn_vault.canChangeCompositionAfter();
          const current_time = Math.round(Date.now()/1000);

          if (current_time <= time_to_rebalance) {
            console.log(`\nOptimiser complete: insufficient time has passed since the previous reweighting. `
                      + `Wait %s seconds and try again.`, time_to_rebalance - current_time);
          }
          else {
            const best_adapter_name = await getAdapterProtocolName(best_adapter);
            console.log(`\nFound a reweight opportunity: shift fund to %s to improve the vault rate from %d% to %d%...`
                       , best_adapter_name
                       , round2(toAPR(current_adapter_rate))
                       , round2(toAPR(best_single_adapter_rate)));

            const scaled_down_gas = Number(gasPrice) / 1000000000;

            if (MAX_GAS < scaled_down_gas) {
                console.log(`Gas is currently too high: your specified maximum is %d gwei, but it's currently %d.`
                          , MAX_GAS
                          , scaled_down_gas);
            }
            else {
              // Okay, NOW we can go!
              const gasLimit = await nirn_vault.estimateGas.rebalanceWithNewAdapters([best_adapter], [weight_unity.toString()]);

              const tx = await nirn_vault.rebalanceWithNewAdapters([best_adapter], [weight_unity.toString()], { gasPrice, gasLimit });
              console.log(`\nSent transaction...`);
              await tx.wait();
              console.log(`\nFinished!`);
            }
          }
        }
      }
    }
}

async function setup() {
  ({ getAdapterProtocolName } = await getAdapterMetadataLookup());
}

async function mass_execute() {
    const total_vaults_to_reweigh = UNDERLYING_LIST.length;

    const gasPrice = (await provider.getGasPrice()).mul(12).div(10);

    for (let ix in UNDERLYING_LIST) {
      console.log('\n------------------------------------');
      console.log('\n*** Executing optimisation %d of %d...'
                , Number(ix) + 1
                , total_vaults_to_reweigh);
      console.log('\n------------------------------------');

      const underlying = UNDERLYING_LIST[ix]
      await(execute(underlying, gasPrice));
    }
}

// All that build-up, leading up to... this.
setup();
mass_execute();