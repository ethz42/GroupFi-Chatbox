import { EventEmitter } from 'events'
import {
  EventCallback,
  JsonRpcEngine,
  JsonRpcResponse
} from 'tanglepaysdk-common'
import {
  SendToTrollboxParam,
  TrollboxResponse,
  TrollboxReadyEventData,
  LoadChatboxOptions,
  ProcessWalletOptions,
  RenderChatboxOptions
} from './types'
import { genOnLoad, toggleChatbox } from './page'
import './page.css'
import { requestHandler } from './handleRequest'

export interface TargetContext {
  targetWindow: WindowProxy
  targetOrigin: string
}

let context: TargetContext | undefined = undefined

const init = (context: TargetContext) => {
  setContext(context)

  _rpcEngine.request({
    params: {
      cmd: 'get_chatbox_info'
    }
  })
  console.info('🚀 ~ init ~ _rpcEngine:', _rpcEngine)
}

function ensureContext() {
  if (context === undefined) {
    throw new Error('Contenxt is undefined.')
  }
}

function setContext(ctx: TargetContext) {
  context = ctx
}

const chatboxRequests: Record<string, EventCallback> = {}
let _seq = 1
const _rpcVersion = 101

const _rpcEngine = JsonRpcEngine.builder<SendToTrollboxParam, unknown>()
  .add(async (req, next) => {
    req.id = _seq++
    req.version = _rpcVersion
    req.params!.cmd = `contentToChatbox##${req.params!.cmd}`
    req.params!.origin = window.location.origin
    req.params!.id = req.id
    return next!(req)
  })
  .add(async (req) => {
    const { id, data, cmd } = req.params!
    ensureContext()
    // context!.targetWindow.postMessage(req.params, context!.targetOrigin)
    context!.targetWindow.postMessage(req.params, '*')
    const { method } = data
    if (cmd === 'contentToChatbox##chatbox_request') {
      return new Promise<JsonRpcResponse<unknown>>((resolve, reject) => {
        chatboxRequests[`chatbox_request_${method}_${req.id ?? 0}`] = (
          res: TrollboxResponse<any>,
          code: number
        ) => {
          if (code === 200) {
            resolve({ id: id!, version: 100, data: res })
          } else {
            reject(res)
          }
        }
      })
    } else {
      return { id: req.id!, version: 100, data: undefined }
    }
  })
  .build()

function isTanglePayProvider(provider: any) {
  if (!provider) {
    return false
  }
  return provider.isTanglePay && provider.isGroupfiNative
}

const ChatboxSDK: {
  walletProvider: any | undefined
  walletType: string | undefined
  events: EventEmitter
  isIframeLoaded: boolean
  chatboxVersion: string | undefined
  request: ({
    method,
    params
  }: {
    method: string
    params: any
  }) => Promise<Partial<unknown> | undefined>
  emit: (key: string, data: any) => void
  dispatchWalletUpdate: (data: { walletType: string }) => void
  processAccount: (data: { account: string }) => void
  processWallet: (data: ProcessWalletOptions) => void
  on: (eventName: string, callBack: (...args: any[]) => void) => () => void
  removeChatbox: () => void
  send: (data: any) => void
  loadChatbox: (params: LoadChatboxOptions) => void
  setWalletProvider: (provider: any) => void
  toggleChatbox: () => void
} = {
  walletProvider: undefined,

  events: new EventEmitter(),

  walletType: undefined,

  isIframeLoaded: false,

  chatboxVersion: undefined,

  setWalletProvider(provider: any) {
    this.walletProvider = provider
  },

  request: async ({ method, params }: { method: string; params: any }) => {
    if (ChatboxSDK.chatboxVersion === undefined) {
      console.log('Chatbox is not ready')
      return
    }
    const res = await _rpcEngine.request({
      params: {
        cmd: 'chatbox_request',
        data: { method, params }
      }
    })
    if (res.error) {
      return res.error
    }
    return res.data
  },

  emit(key: string, data: any) {
    if (!ChatboxSDK.isIframeLoaded) {
      return
    }
    this.send({
      cmd: 'dapp_event',
      data: { key, data }
    })
  },

  send(data: any) {
    ensureContext()
    // context!.targetWindow.postMessage(data, context!.targetOrigin)
    context!.targetWindow.postMessage(data, '*')
  },

  loadChatbox(options: LoadChatboxOptions) {
    const { provider, ...rest } = options
    const renderChatboxOptions: RenderChatboxOptions = {
      ...rest,
      isGroupfiNativeMode: false
    }
    if (provider) {
      ChatboxSDK.setWalletProvider(provider)
    }
    if (isTanglePayProvider(provider)) {
      renderChatboxOptions.isGroupfiNativeMode = true
    }
    if (!this.isIframeLoaded) {
      genOnLoad(init, renderChatboxOptions)()
    }
  },

  removeChatbox() {
    try {
      const btnDom = document.getElementById('groupfi_btn')
      const iframeContainerDom = document.getElementById('groupfi_box')

      const iframe = document.getElementById(
        'trollbox'
      ) as HTMLIFrameElement | null

      if (iframe !== null) {
        iframe.onload = null
        iframe.src = 'about:blank'
      }

      if (btnDom !== null) {
        btnDom.style.display = 'none'
      }

      if (iframeContainerDom !== null) {
        iframeContainerDom.style.display = 'none'
      }

      ChatboxSDK.isIframeLoaded = false
      ChatboxSDK.walletType = undefined
      ChatboxSDK.chatboxVersion = undefined
    } catch (error) {
      console.error('Error removing iframe:', error)
    }
  },

  dispatchWalletUpdate(data: { walletType: string }) {
    const walletType = data.walletType
    ChatboxSDK.walletType = walletType

    ChatboxSDK.emit('wallet-type-update', {
      walletType
    })
  },

  processAccount(data: { account: string }) {
    ChatboxSDK.emit('metamask-account-changed', data)
  },

  processWallet(data: ProcessWalletOptions) {
    const { provider, isWalletConnected } = data

    const walletTypeChangedData: {
      isWalletConnected: boolean
      isGroupfiNativeMode: boolean
    } = { isWalletConnected, isGroupfiNativeMode: false }

    if (isWalletConnected && !provider) {
      throw new Error('Provider is required.')
    }
    if (provider) {
      ChatboxSDK.setWalletProvider(provider)
    }
    if (isTanglePayProvider(provider)) {
      walletTypeChangedData.isGroupfiNativeMode = true
    }
    ChatboxSDK.emit('wallet-type-changed', walletTypeChangedData)
  },

  on(eventName: string, callBack: (...args: any[]) => void): () => void {
    const eventKey = `chatbox-event-${eventName}`
    this.events.on(eventKey, callBack)
    return () => this.events.off(eventKey, callBack)
  },
  toggleChatbox
}

window.addEventListener('message', function (event: MessageEvent) {
  if (context === undefined) {
    return
  }
  if (
    event.source !== context.targetWindow ||
    event.origin !== context.targetOrigin
  ) {
    return
  }
  let { cmd, data, reqId, code } = event.data
  cmd = (cmd ?? '').replace('contentToDapp##', '')
  switch (cmd) {
    case 'get_chatbox_info': {
      ChatboxSDK.chatboxVersion = data.version
      ChatboxSDK.isIframeLoaded = true

      const eventData: TrollboxReadyEventData = {
        chatboxVersion: data.version
      }
      window.dispatchEvent(
        new CustomEvent('chatbox-ready', { detail: eventData })
      )
      ChatboxSDK.events.emit('chatbox-ready', eventData)
      break
    }
    case 'chatbox_request': {
      const callBack =
        chatboxRequests[`chatbox_request_${data.method}_${reqId ?? 0}`]
      if (callBack) {
        callBack(data.response, code)
      }
      break
    }
    case 'sdk_request': {
      requestHandler.handle(data.method, data.params).then((res) => {
        ChatboxSDK.send({
          cmd: `contentToChatbox##sdk_request`,
          id: reqId,
          data: {
            method: data.method,
            data: res
          }
        })
      })
      break
    }
    case 'collapse-chatbox':
      console.log('===> Dapp receive an collapse-chatbox event')
      toggleChatbox()
      break
  }
})

export default ChatboxSDK
