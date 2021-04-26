import {
  Coin,
  isTxError,
  MsgExecuteContract,
  MsgInstantiateContract,
  MsgMigrateContract,
  MsgStoreCode,
  StdFee,
  MnemonicKey
} from '@terra-money/terra.js';
import { readFileSync } from 'fs';


export async function deployFactoryContract(terra, wallet) {

    let pairCodeId = await uploadContract(terra, wallet, './artifacts/terraswap_pair.wasm');
    console.log(`Uploaded Terraswap_Pair contract code: ${pairCodeId}`);

    let tokenCodeId = await uploadContract(terra, wallet, './artifacts/terraswap_token.wasm');
    console.log(`Uploaded Terraswap_Token contract code: ${tokenCodeId}`);    

    let factoryCodeId = await uploadContract(terra, wallet, './artifacts/terraswap_factory.wasm');
    console.log(`Uploaded Terraswap_Factory contract code: ${factoryCodeId}`);    

    const factoryInitMsg = {"pair_code_id": pairCodeId,"token_code_id": tokenCodeId,"init_hook":null};
    const factoryAddress = await instantiateContract(terra, wallet, factoryCodeId, factoryInitMsg);
    console.log(`Instantiated Terraswap_Factory contract, address :  ${factoryAddress}`);
  
    return {  factoryAddress, pairCodeId, tokenCodeId, factoryCodeId};
}






export async function deployTokenContract(terra, wallet, tokenInitMsg) {

  let tokenCodeId = await uploadContract(terra, wallet, './artifacts/terraswap_token.wasm');
  console.log(`Uploaded Terraswap_Token contract code: ${tokenCodeId}`);    

  const tokenAddress = await instantiateContract(terra, wallet, tokenCodeId, tokenInitMsg);
  console.log(`Instantiated Token contract, address :  ${tokenAddress}`);

  return tokenAddress;
}




export async function performTransaction(terra, wallet, msg) {
  const tx = await wallet.createAndSignTx({
    msgs: [msg],
    fee: new StdFee(30000000, [
      new Coin('uluna', 4500000),
      new Coin('uusd', 4500000),
      new Coin('umnt', 4000000),
      new Coin('ukrw', 4000000),
      new Coin('usdr', 4000000)
    ]),
  });
  const result = await terra.tx.broadcast(tx);
  if (isTxError(result)) {
    throw new Error(
      `transaction failed. code: ${result.code}, codespace: ${result.codespace}, raw_log: ${result.raw_log}`
    );
  }
  return result
}

export async function uploadContract(terra, wallet, filepath) {
  const contract = readFileSync(filepath, 'base64');
  const uploadMsg = new MsgStoreCode(wallet.key.accAddress, contract);
  let result = await performTransaction(terra, wallet, uploadMsg);
  return Number(result.logs[0].eventsByType.store_code.code_id[0]) //code_id
}

export async function instantiateContract(terra, wallet, codeId, msg) {
  const instantiateMsg = new MsgInstantiateContract(wallet.key.accAddress, codeId, msg, undefined, true);
  let result = await performTransaction(terra, wallet, instantiateMsg)
  return result.logs[0].events[0].attributes[2].value //contract address
}

export async function executeContract(terra, wallet, contractAddress, msg) {
  const executeMsg = new MsgExecuteContract(wallet.key.accAddress, contractAddress, msg);
  return await performTransaction(terra, wallet, executeMsg);
}

export async function queryContract(terra, contractAddress, query) {
  return await terra.wasm.contractQuery(
    contractAddress,
    query
  )
}

export async function deployContract(terra, wallet, filepath, initMsg) {
  const codeId = await uploadContract(terra, wallet, filepath);
  return await instantiateContract(terra, wallet, codeId, initMsg);
}




export async function migrate(terra, wallet, contractAddress, newCodeId) {
  const migrateMsg = new MsgMigrateContract(wallet.key.accAddress, contractAddress, newCodeId, {});
  return await performTransaction(terra, wallet, migrateMsg);
}

export function recover(terra, mnemonic) {
  const mk = new MnemonicKey({ mnemonic: mnemonic });
  return terra.wallet(mk);
}

export function initialize(terra) {
  const mk = new MnemonicKey();

  console.log(`Account Address: ${mk.accAddress}`);
  console.log(`MnemonicKey: ${mk.mnemonic}`);

  return terra.wallet(mk);
}

export async function deployBasecampContract(terra, wallet, cooldownDuration, unstakeWindow, codeId=undefined) {
  if (!codeId) {
    console.log("Uploading Cw20 Contract...");
    codeId = await uploadContract(terra, wallet, './artifacts/cw20_token.wasm');
  }

  console.log("Deploying Basecamp...");
  let initMsg = {"cw20_code_id": codeId, "cooldown_duration": cooldownDuration, "unstake_window": unstakeWindow};
  let basecampCodeId = await uploadContract(terra, wallet, './artifacts/basecamp.wasm');
  const instantiateMsg = new MsgInstantiateContract(wallet.key.accAddress, basecampCodeId, initMsg, undefined, true);
  let result = await performTransaction(terra, wallet, instantiateMsg);

  let basecampContractAddress = result.logs[0].eventsByType.from_contract.contract_address[0];

  console.log("Basecamp Contract Address: " + basecampContractAddress);
  return basecampContractAddress
}
