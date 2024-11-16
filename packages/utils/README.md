Follow https://github.com/brevis-network/brevis-quickstart-ts for basic setup

1. download go

2. compile circut

///////////////////////////////////////////////////////////////////////////////
// vk hash: 0x25d2751bfc09b1222b834f3043762dad7e1591671f8c03456996cabe53a95c71
///////////////////////////////////////////////////////////////////////////////

3. Deploy TOkenTransferZkOnly.sol

https://sepolia.etherscan.io/address/0x6E2CcFEc1B3d8Dd22A40BF6f5A592A5765f0ff9d

4. Call TokenTransferZkOnly.setVk with vk hash

5. call ./app/index.ts to request proof from Brevis, get proofId and nounce

query: proofId 0x6f478f47319620692acf0d59241c9cbecdb9596f6f185309a11c6c4d75e83df2 nonce 1731683213 waiting for payment. call BrevisRequest.sendRequest to initiate the payment

6. call BrevisRequest.sendRequest for verification

BrevisRequest contract: https://sepolia.etherscan.io/address/0xa082f86d9d1660c29cf3f962a31d7d20e367154f

Sample request tx: https://sepolia.etherscan.io/tx/0xc42aedfd75a78427e375ccb5a57d5b8e626b0ea1b2b3484ee95a59a1059cbcf5

6. look at response onchain

Proof: 
https://sepolia.etherscan.io/tx/0x162bb0a73ae9b42b44e9796c55e2831c77746a6f973957771023f894768047ac

