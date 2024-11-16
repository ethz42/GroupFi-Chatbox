import { Brevis, ErrCode, ProofRequest, Prover, StorageData, asUint248 } from 'brevis-sdk-typescript';
import { ethers } from 'ethers';

function calculateBalanceSlot(userAddress: string): string {
    // Convert address to bytes32 format
    const paddedAddress = ethers.utils.hexZeroPad(userAddress, 32);
    // USDT uses slot 2 for balanceOf mapping
    const slot = 2;

    // Calculate the storage slot using keccak256(address + slot)
    const storageSlot = ethers.utils.keccak256(
        ethers.utils.concat([
            paddedAddress,
            ethers.utils.hexZeroPad(ethers.utils.hexlify(slot), 32)
        ])
    );

    return storageSlot;
}

async function getLatestBlockNumber() {
    // Connect to an Ethereum provider
    const RPC_URL = 'https://eth-mainnet.g.alchemy.com/v2/-Z5IK5ZknQgG4obvaW3fCSA92G8-5CPE';
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);

    // Get the latest block number
    const blockNumber = await provider.getBlockNumber();
    return blockNumber;
}

async function main() {
    const prover = new Prover('localhost:33247');
    const brevis = new Brevis('appsdkv3.brevis.network:443');

    const proofReq = new ProofRequest();

    // Assume user address will provided by command line
    const blockNumber = await getLatestBlockNumber() - 100; // block number approx finalized 20mins ago 
    const userAddress = process.argv[2];
    const slot = calculateBalanceSlot(userAddress);
    const usdtAddress = "0xdac17f958d2ee523a2206206994597c13d831ec7";

    proofReq.addStorage(
        new StorageData({
            block_num: blockNumber,
            address: usdtAddress,
            slot: slot,
        })
    )

    const basic = {
        UserAddr: asUint248(userAddress),
    };
    proofReq.setCustomInput(basic);

    console.log(`Send prove request for ${blockNumber}, ${userAddress}, ${slot}`);

    const proofRes = await prover.prove(proofReq);
    // error handling
    if (proofRes.has_err) {
        const err = proofRes.err;
        switch (err.code) {
            case ErrCode.ERROR_INVALID_INPUT:
                console.error('invalid receipt/storage/transaction input:', err.msg);
                break;

            case ErrCode.ERROR_INVALID_CUSTOM_INPUT:
                console.error('invalid custom input:', err.msg);
                break;

            case ErrCode.ERROR_FAILED_TO_PROVE:
                console.error('failed to prove:', err.msg);
                break;
        }
        return;
    }
    console.log('proof', proofRes.proof);

    try {
        const brevisRes = await brevis.submit(proofReq, proofRes, 1, 11155111, 0, "", "");
        console.log('brevis res', brevisRes);

        await brevis.wait(brevisRes.queryKey, 11155111);
    } catch (err) {
        console.error(err);
    }
}

main();
