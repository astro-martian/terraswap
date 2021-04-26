// import 'dotenv/config.js';
import {deployFactoryContract, deployTokenContract, executeContract, queryContract} from "./helpers.mjs";
import {LocalTerra} from "@terra-money/terra.js";

const terra = new LocalTerra();
const wallet = terra.wallets.test1;

// console.log(wallet.key.accAddress);

let returnedValues = await deployFactoryContract(terra, wallet);
console.log("\n");

let tokenInitMsg = { "name": "MIR",
                     "symbol": "MIR",
                     "decimals": 18,
                     "initial_balances": [],
                     "mint": null,
                     "init_hook":null
  }
let tokenAddress = await deployTokenContract(terra, wallet,tokenInitMsg);
console.log("\n");

let createPairMsg = { "create_pair": { 
  "asset_infos": [
      { "native_token" : {  "denom": "uusd" }},
      { "token" : { "contract_addr": tokenAddress }}, 
    ],
    "init_hook": null,
  }}

  let ret_val = await executeContract( terra, wallet, returnedValues.factoryAddress, createPairMsg);
  console.log("Pair Initialized \n");


  let queryPairMsg = { "pair": { 
    "asset_infos": [
        { "native_token" : {  "denom": "uusd" }},
        { "token" : { "contract_addr": tokenAddress }}, 
      ],
    }}
    let ret_vals = await queryContract( terra, returnedValues.factoryAddress, queryPairMsg);
    console.log(ret_vals);







// await setup(terra, wallet, returnedValues.lpAddress, {initialAssets, initialDeposits, initialBorrows});
