use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

use cosmwasm_std::{Api, CanonicalAddr, Extern, Order, Querier, StdError, StdResult, Storage};

use cosmwasm_storage::{Bucket, ReadonlyBucket, ReadonlySingleton, Singleton};
use terraswap::asset::{AssetInfoRaw, PairInfo, PairInfoRaw};

static KEY_CONFIG: &[u8] = b"config";
static PREFIX_PAIR_INFO: &[u8] = b"pair_info";

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct Config {
    pub owner: CanonicalAddr,
    pub pair_code_id: u64,
    pub token_code_id: u64,
}

pub fn store_config<S: Storage>(storage: &mut S, data: &Config) -> StdResult<()> {
    Singleton::new(storage, KEY_CONFIG).save(data)
}

pub fn read_config<S: Storage>(storage: &S) -> StdResult<Config> {
    ReadonlySingleton::new(storage, KEY_CONFIG).load()
}

pub fn store_pair<S: Storage>(storage: &mut S, data: &PairInfoRaw) -> StdResult<()> {
    let mut asset_infos = data.asset_infos.clone().to_vec();
    asset_infos.sort_by(|a, b| a.as_bytes().cmp(&b.as_bytes()));

    let mut pair_bucket: Bucket<S, PairInfoRaw> = Bucket::new(PREFIX_PAIR_INFO, storage);
    pair_bucket.save( &[asset_infos[0].as_bytes(), asset_infos[1].as_bytes()].concat(), &data, )
}

pub fn read_pair<S: Storage>(  storage: &S,  asset_infos: &[AssetInfoRaw; 2],) -> StdResult<PairInfoRaw> {
    let mut asset_infos = asset_infos.clone().to_vec();
    asset_infos.sort_by(|a, b| a.as_bytes().cmp(&b.as_bytes()));

    let pair_bucket: ReadonlyBucket<S, PairInfoRaw> = ReadonlyBucket::new(PREFIX_PAIR_INFO, storage);
    match pair_bucket.load(&[asset_infos[0].as_bytes(), asset_infos[1].as_bytes()].concat()) {
        Ok(v) => Ok(v),
        Err(_e) => Err(StdError::generic_err("no pair data stored")),
    }
}

// settings for pagination
const MAX_LIMIT: u32 = 30;
const DEFAULT_LIMIT: u32 = 10;
pub fn read_pairs<S: Storage, A: Api, Q: Querier>(
    deps: &Extern<S, A, Q>,
    start_after: Option<[AssetInfoRaw; 2]>,
    limit: Option<u32>,
) -> StdResult<Vec<PairInfo>> {
    let pair_bucket: ReadonlyBucket<S, PairInfoRaw> =
        ReadonlyBucket::new(PREFIX_PAIR_INFO, &deps.storage);

    let limit = limit.unwrap_or(DEFAULT_LIMIT).min(MAX_LIMIT) as usize;
    let start = calc_range_start(start_after);

    pair_bucket
        .range(start.as_deref(), None, Order::Ascending)
        .take(limit)
        .map(|item| {
            let (_, v) = item?;
            v.to_normal(&deps)
        })
        .collect()
}

// this will set the first key after the provided key, by appending a 1 byte
fn calc_range_start(start_after: Option<[AssetInfoRaw; 2]>) -> Option<Vec<u8>> {
    start_after.map(|asset_infos| {
        let mut asset_infos = asset_infos.to_vec();
        asset_infos.sort_by(|a, b| a.as_bytes().cmp(&b.as_bytes()));

        let mut v = [asset_infos[0].as_bytes(), asset_infos[1].as_bytes()]
            .concat()
            .as_slice()
            .to_vec();
        v.push(1);
        v
    })
}
