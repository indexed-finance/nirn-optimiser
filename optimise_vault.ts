/**

Nirn Vault Optimiser: Version 0.1

I'm not writing a license blurb for this. Do what you want with it.

Fill out lines 21, 24 and 28 as appropriate, then run the script.

**/

import { InfuraProvider } from '@ethersproject/providers';
import { Contract } from '@ethersproject/contracts';
import { Wallet } from '@ethersproject/wallet';

// ------------------------
// THINGS *YOU* NEED TO ENTER
// ------------------------

// Enter your private key here, without the leading 0x.
// Do NOT go putting this on GitHub or something of the sort.
const PRIVATE_KEY = "{YOUR_PRIVATE_KEY_HERE_PLEASE_GOD_KEEP_IT_SAFE}"

// Enter your Infura API key here.
const provider = new InfuraProvider('mainnet', '{YOUR_API_KEY_HERE}');

// Enter the token address for the underlying you want to optimise the vault for.
// As an example, this is the address for USDT.
const underlying = '0xdAC17F958D2ee523a2206206994597C13D831ec7'

// -------------------
// Top-Level Variables
// -------------------

const weight_unity = 1000000000000000000;

const key = Buffer.from(PRIVATE_KEY, 'hex');
const wallet = new Wallet(key, provider);

const adapter_registry_addr = '0x5F2945604013Ee9f80aE2eDDb384462B681859C4';
const null_addr = '0x0000000000000000000000000000000000000000'

const AdapterRegistryABI = require('./optimiser-deployments/AdapterRegistry.json');
const VaultABI = require('./optimiser-deployments/NirnVault.json');

let adapter_registry: Contract;
let nirn_vault: Contract;

// -------------------
// Auxiliary Functions
// -------------------

function zip(a, b) {
    return a.map((k, i) => [k, b[i]]);
}

function round2(n) {
    return Math.round(n * 100)/100;
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

// --------------------
// The Actual Optimiser
// --------------------

async function execute() {
    // Administrative, fetching names and what have you
    await setup_registry();
    const vault = await adapter_registry.vaultsByUnderlying(underlying);
    await setup_vault(vault);
    const vault_underlying = await nirn_vault.name();
    console.log(`Targeted vault is %s, at address %s`, vault_underlying, vault);

    // Find current weightings of the vault to determine existing APR
    const current_adapters_weights = await nirn_vault.getAdaptersAndWeights();

    const current_adapters = current_adapters_weights[0];
    const current_weights = current_adapters_weights[1].map(a => Number(a));

    const combined_current = zip(current_adapters, current_weights);
    console.log(`\nCurrent adapter weightings:`);
    console.log(combined_current);

    // Get sorted list of adapters and APRs for current deposit levels for the given vault
    const sorted_adapters = await adapter_registry.getAdaptersSortedByAPRWithDeposit(underlying, 0, null_addr);
    const sorted_adapter_map = new Map<String,Number>(zip(sorted_adapters[0], sorted_adapters[1].map(a => Number(a))));
    console.log(`\nAvailable adapter rates at current levels:`);
    console.log(sorted_adapter_map);

    /** OPTIMISER VERSION 1: INCREDIBLY NAIVE
    /
    / Step 1: Is there just one adapter being used?
    /   * Yes: move on.
    /   * No:  you're out of luck for this version. BREAK;
    / Step 2: Does the currently utilised adapter have the highest rate of all potential adapters for the vault?
    /   * No:  move on.
    /   * Yes: nothing to do. BREAK;
    / Step 3: Is there only one adapter registered to the vault?
    /   * Yes: the hell are you trying to optimise, then? Begone. BREAK;
    /   * No:  move on.
    / Step 4: Is the difference between the highest available adapter and the current one at least 5%?
    /   * Yes: you have a reweight opportunity!
    /   * No:  nothing to do. BREAK;
    / Step 5: Has at least an hour passed since the last weight/adapter-shifting rebalance?
    /   * Yes: you're good to do, submit the reweighting!
    /   * No:  you have to wait a bit. BREAK;
    / Step 6: ???
    / Step 7: Profit!
    /
    / Note: The optimiser does *not* yet count for APR shifts when moving capital between adapters.
    /
    **/

    const only_one_adapter = current_adapters.length == 1
    const current_adapter = current_adapters[0]
    const best_adapter = sorted_adapters[0][0]

    if (!only_one_adapter) {
        console.log(`\nOptimiser violation: more than one adapter currently in use. Please wait for an improved version of the optimiser.`);
    }
    else {
      const current_best_adapter = sorted_adapters[0].indexOf(current_adapter) == 0;

      if (current_best_adapter) {
        console.log(`\nOptimiser violation: vault is currently utilising the best APR adapter.`);
      }
      else {
        const multiple_potential_adapters = sorted_adapter_map.size > 1;

        if (!multiple_potential_adapters) {
          console.log(`\nOptimiser violation: only one available adapter for the vault.`);
        }
        else {
          const current_adapter_rate = sorted_adapter_map.get(current_adapter);
          const best_adapter_rate = sorted_adapter_map.get(best_adapter);

          const adapter_difference = Number(best_adapter_rate) / Number(current_adapter_rate);

          if (adapter_difference < 1.05) {
            console.log(`\nOptimiser violation: insufficient percentage gain for reweighting - need at least 1.05x, got %sx.`, round2(adapter_difference));
          }
          else {
            const time_to_rebalance = await nirn_vault.canChangeCompositionAfter();
            const current_time = Math.round(Date.now()/1000);

            if (current_time <= time_to_rebalance) {
              console.log(`\nOptimiser violation: insufficient time has passed since the previous reweighting. `
                        + `Wait %s seconds and try again.`, time_to_rebalance - current_time);
            }
            else {
              // Okay, NOW we can go!
              const gasPrice = (await provider.getGasPrice()).mul(12).div(10);
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

// All that build-up, leading up to... this.
execute();
