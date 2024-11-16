import fetch from 'node-fetch'; 
import dotenv from 'dotenv';

dotenv.config();

async function getTokenIds(walletAddress, contractAddress, apiKey) {
  const url = `https://restapi.nftscan.com/v2/account/own/${walletAddress}?erc_type=erc721&show_attribute=true&sort_field=&sort_direction=desc&contract_address=${contractAddress}`;
  const options = {
    headers: {
      'x-api-key': apiKey,
    },
  };

  try {
    const response = await fetch(url, options);
    const data = await response.json();
    const tokenIds = data.assets
      .filter(asset => asset.contract_address === contractAddress)
      .map(asset => asset.token_id);

    return tokenIds;
  } catch (error) {
    console.error('Error:', error);
    return [];
  }
}

// test
// const NFTSCAN_API_KEY = process.env.NFTSCAN_API_KEY;
// const poapContractAddress = '0x22c1f6050e56d2876009903609a2cc3fef83b415';
// const queryWalletAddress = '0xe583f95bf95d0883f94efe844442c8bfc9dd7a7f';

// getTokenIds(queryWalletAddress, poapContractAddress, NFTSCAN_API_KEY)
//   .then(tokenIds => console.log('Token IDs:', tokenIds));
