import React from 'react';
import { useAccount } from 'wagmi'
import { ethers } from 'ethers'
import store from '../../pc/src/redux/store'
import { setWalletInfo, setMetaMaskAccountFromDapp, setIsBrowseMode } from '../../pc/src/redux/appConfigSlice'
import { useMessageDomain } from 'groupfi-sdk-chat' 
import { MetaMaskWallet } from 'groupfi-sdk-chat'
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { ConnectWallet } from './app';

import {usePrivy} from '@privy-io/react-auth';

import PrivyLoginButton from '../../wallet/src/privyLogin'


// export default function ConnectButton () {
//   const {connectWallet} = usePrivy();
//   return <button onClick={ConnectWallet}> Connect Wallet </button>
// }


function isEvmAddress(address: string): boolean {
  return ethers.isAddress(address);
}

export function Account() {
  const { address, isDisconnected } = useAccount()
  const { messageDomain } = useMessageDomain() 
  const {connectWallet} = usePrivy();
  const disableLogin = false;
  const handleLogin = async () => {
    try {
        // Call the connectWallet function from Privy
        const result = await connectWallet();
        if (result) {
            console.log('Login successful:', result);
            // You can dispatch actions or update state here based on the result
        } else {
            console.error('Login failed: No result returned');
        }
    } catch (error) {
        console.error('Login error:', error);
    }
};


  React.useEffect(() => {
    console.log('account changed', address, Date.now());

    if (address) {
      store.dispatch(setWalletInfo({walletType: MetaMaskWallet}))
      const lowerCaseAddress = isEvmAddress(address) ? address.toLowerCase() : address
      store.dispatch(setMetaMaskAccountFromDapp(lowerCaseAddress))
      messageDomain.isWalletConnected = () => true
      store.dispatch(setIsBrowseMode(false))
    }

    if (!address) {
      store.dispatch(setIsBrowseMode(isDisconnected))
    }
  }, [address]);

  return (
    <div className="flex w-full items-center justify-between px-6">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white truncate">GroupFi</h1>
      {/* <ConnectButton.Custom>
        {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
          return (
            <div className="flex-shrink-0">
              <ConnectButton />
            </div>
          )
        }}
      </ConnectButton.Custom> */}

      <PrivyLoginButton disableLogin={disableLogin} handleLogin={handleLogin} address={address}/>
    </div>
  )
}