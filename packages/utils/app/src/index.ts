import { Brevis, ErrCode, ProofRequest, Prover, StorageData, asUint248 } from 'brevis-sdk-typescript';
import { ethers } from 'ethers';

async function main() {
    const prover = new Prover('localhost:33247');
    const brevis = new Brevis('appsdkv3.brevis.network:443');

    const proofReq = new ProofRequest();

    // Assume block number / slot will provided by command line
    const blockNumber = parseInt(process.argv[2]);
    const userAddress = process.argv[3];
    const slot = process.argv[4];
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
