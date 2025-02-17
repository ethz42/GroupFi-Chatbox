import TrollboxSDK from './index'
import { hexStringToUint8Array, uint8ArrayToHexString } from './util'
import { ethers } from 'ethers'

const isEthereumProvider = (provider: any) => {
  return provider.chainId !== undefined
}

export const requestHandler = {
  async handle(method: string, params: any) {
    switch (method) {
      case 'eth_decrypt':
        return await this.ethDecrypt(params)
      case 'personal_sign':
        return await this.personalSign(params)
      case 'eth_getEncryptionPublicKey':
        return await this.ethGetEncryptionPublicKey(params)
    }
  },
  ethDecrypt: async (params: any): Promise<{ code: number; res?: any }> => {
    try {
      if (TrollboxSDK.walletProvider === undefined) {
        throw new Error('walletProvider is undefined')
      }
      const res = await TrollboxSDK.walletProvider.request({
        method: 'eth_decrypt',
        params: params
      })
      return { code: 200, res }
    } catch (error) {
      return { code: 9999 }
    }
  },
  personalSign: async (params: any) => {
    try {
      if (TrollboxSDK.walletProvider === undefined) {
        throw new Error('walletProvider is undefined')
      }
      let res: any
      const [signTextHex, address] = params
      if (isEthereumProvider(TrollboxSDK.walletProvider)) {
        console.log('==>personal_sign params:', signTextHex, address)
        res = await TrollboxSDK.walletProvider.request({
          method: 'personal_sign',
          params: [signTextHex, address]
        })
      } else {
        const encodedMessage = hexStringToUint8Array(signTextHex)
        const signedMessage = await TrollboxSDK.walletProvider.signMessage(
          encodedMessage,
          'utf8'
        )
        res = uint8ArrayToHexString(signedMessage.signature)
      }
      return { code: 200, res }
    } catch (error) {
      return { code: 9999 }
    }
  },
  ethGetEncryptionPublicKey: async (params: any) => {
    try {
      if (TrollboxSDK.walletProvider === undefined) {
        throw new Error('walletProvider is undefined')
      }
      const res = (await TrollboxSDK.walletProvider.request({
        method: 'eth_getEncryptionPublicKey',
        params
      })) as string
      return { code: 200, res }
    } catch (error) {
      return { code: 9999 }
    }
  }
}
