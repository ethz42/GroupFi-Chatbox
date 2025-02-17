import { useRef, useState, useEffect, Dispatch, SetStateAction } from 'react'

// @ts-ignore
import PlusSVG from 'public/icons/plus-sm.svg?react'
// @ts-ignore
import CancelSVG from 'public/icons/error.svg?react'

// import sdkInstance, { trollboxEventEmitter } from 'sdk'
import sdkInstance from 'sdk'

import { GroupFiService, useMessageDomain } from 'groupfi-sdk-chat'
import { addressToUserName, classNames, getTopLevelDomain } from 'utils'
import { QuotedMessage, TrollboxEmoji, ChatRoomSendingButton } from './index'
import { Modal } from '../Shared'
import MessageViewer, {
  getEmojiUrlByunified,
  getMessageElements
} from './MessageViewer'
import ErrorCancel from 'public/icons/error-cancel.svg'
import ErrorCircle from 'public/icons/error-circle.svg'

async function parseContentFromPasteEvent(
  item: DataTransferItem
): Promise<string | File | null> {
  return new Promise((resolve, reject) => {
    if (item.type === 'text/plain') {
      item.getAsString((data: string) => {
        resolve(data)
      })
    } else if (item.type.indexOf('image') !== -1) {
      const file = item.getAsFile()
      resolve(file)
    } else {
      resolve(null)
    }
  })
}

async function uploadImg(file: File, groupFiService: GroupFiService) {
  try {
    const { imageURL, uploadPromise, dimensionsPromise } =
      await groupFiService.uploadImageToS3({
        fileGetter: async () => file
      })
    const { width, height } = await dimensionsPromise
    const ratio = (width / height).toFixed(2)
    return imageURL + ratio
  } catch (error) {
    console.log(error)
  }
}

// \u4e00-\u9fa5：匹配基础的中文汉字。
const ChineseRegex = /[\u4e00-\u9fa5]/g

function removeChineseCharacters(str: string) {
  return str.replace(ChineseRegex, '')
}

export default function MessageInput({
  groupId,
  onSend,
  onQuoteMessage,
  quotedMessage
}: {
  groupId: string
  onQuoteMessage: Dispatch<SetStateAction<QuotedMessage | undefined>>
  quotedMessage?: QuotedMessage
  onSend: (_: boolean) => void
}) {
  const { messageDomain } = useMessageDomain()

  const groupFiService = messageDomain.getGroupFiService()

  const messageInputRef = useRef<HTMLDivElement | null>(null)

  const [lastRange, setLastRange] = useState<Range | undefined>(undefined)

  const [messageInputAlertType, setMessageInputAlertType] = useState<
    number | undefined
  >(undefined)

  const [invalidInputAlert, setInvalidInputAlert] = useState(false)
  const invalidInputAlertTimer = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (invalidInputAlert) {
      invalidInputAlertTimer.current = setTimeout(() => {
        setInvalidInputAlert(false)
      }, 1000 * 3)
    }
    return () => {
      if (invalidInputAlertTimer.current) {
        clearTimeout(invalidInputAlertTimer.current)
      }
    }
  }, [invalidInputAlert])

  const messageInputfocus = () => {
    const htmlDivElement = messageInputRef.current
    if (htmlDivElement !== null) {
      htmlDivElement.focus()
    }
  }

  const dappDomain = sdkInstance.getDappDomain()
  const topLevelDomain =
    dappDomain !== undefined ? getTopLevelDomain(dappDomain) : undefined

  const [imageList, setImageList] = useState<
    {
      file: File
      imgBase64Url: string
    }[]
  >([])

  const uploadImgMapRef = useRef<Map<File, Promise<string | undefined>> | null>(
    new Map()
  )

  const [isGeneratingMessageText, setIsGenerationgMessageText] = useState(false)

  const generateImgMessage = async () => {
    try {
      const imgUrl = []
      for (const image of imageList) {
        const promise = uploadImgMapRef.current!.get(image.file)
        const url = await promise
        imgUrl.push(url)
      }
      return imgUrl.map((url) => `%{img:${url}}`).join('')
    } catch (error) {
      console.log('generateImgMessage error', error)
    }
  }

  const clearImg = () => {
    if (imageList.length === 0) {
      return
    }
    for (const image of imageList) {
      uploadImgMapRef.current!.delete(image.file)
    }
    setImageList([])
  }

  const handlePastedImg = async (content: File) => {
    let reader: FileReader | null = new FileReader()

    reader.onload = function (e: ProgressEvent<FileReader>) {
      const result = e.target?.result
      const newImage = {
        file: content,
        imgBase64Url: result as string
      }
      setImageList((old) => [...old, newImage])

      uploadImgMapRef.current!.set(content, uploadImg(content, groupFiService))

      reader = null
    }
    reader.readAsDataURL(content)
  }

  const handlePastedStr = (content: string) => {
    const elements = getMessageElements(content, true)

    const elementDoms = elements.map(({ type, value }) => {
      if (type === 'text' || type === 'link') {
        return document.createTextNode(value)
      } else if (type === 'emo') {
        const img = document.createElement('img')
        img.src = getEmojiUrlByunified(value)
        img.alt = value
        img.innerText = `%{emo:${value}}`
        img.className = 'emoji_in_message_input'
        return img
      }
    })

    const selection = window.getSelection()
    const range = selection?.getRangeAt(0)

    if (range && selection) {
      for (const dom of elementDoms) {
        if (dom !== undefined) {
          range.insertNode(dom)
          range.collapse(false)
        }
      }
    }
  }

  useEffect(() => {
    messageInputfocus()

    return () => {
      uploadImgMapRef.current = null
    }
  }, [])

  if (isGeneratingMessageText) {
    return <ChatRoomSendingButton />
  }

  return (
    <div
      // className={classNames(
      //   'w-full bg-[#F2F2F7] dark:bg-[#3C3D3F] rounded-2xl relative p-2'
      // )}
      className={classNames(
        'w-full bg-[#F2F2F7] dark:bg-[#3C3D3F] rounded-2xl p-2'
      )}
    >
      {imageList.length > 0 && (
        <div className={classNames('w-full')}>
          <div
            className={classNames(
              'bg-white dark:bg-[#212122] flex-1 p-2 mb-2 rounded-xl mx-auto whitespace-nowrap overflow-auto'
            )}
          >
            {imageList.map(({ imgBase64Url, file }, index) => (
              <div key={index} className={classNames('mr-2 inline-block')}>
                <img
                  src={imgBase64Url}
                  className={classNames(
                    'h-24 shink-0 rounded mr-2 inline-block'
                  )}
                />
                <CancelSVG
                  onClick={() => {
                    setImageList((old) => old.filter((_, idx) => idx !== index))
                    uploadImgMapRef.current!.delete(file)
                  }}
                  className={classNames(
                    'stroke-black dark:stroke-white cursor-pointer inline-block align-top'
                  )}
                />
              </div>
            ))}
          </div>
        </div>
      )}
      <div className={classNames('flex flex-row items-end')}>
        {/* <img
          onClick={() => {
            setMessageInputAlertType(2)
          }}
          className={classNames('flex-none mr-2 cursor-pointer')}
          src={MessageSVG}
        /> */}
        <TrollboxEmoji
          messageInputRef={messageInputRef}
          lastRange={lastRange}
        />
        <div
          className={classNames(
            'flex-1 max-w-full overflow-hidden flex flex-col-reverse'
          )}
        >
          <div
            ref={messageInputRef}
            onBlur={function (event: React.FocusEvent) {
              const seletion = getSelection()
              const range = seletion?.getRangeAt(0)
              setLastRange(range)
            }}
            onPaste={async function (event: React.ClipboardEvent) {
              event.preventDefault()

              let items = event.clipboardData.items

              for (const item of items) {
                let content = await parseContentFromPasteEvent(item)

                if (content instanceof File) {
                  handlePastedImg(content)
                } else if (typeof content === 'string') {
                  if (ChineseRegex.test(content)) {
                    content = removeChineseCharacters(content)
                    setInvalidInputAlert(true)
                  }
                  handlePastedStr(content)
                }
              }
            }}
            onInput={(event: React.FormEvent<HTMLDivElement>) => {
              const messageInputDom = messageInputRef.current
              let isChineseFound = false
              if (messageInputDom) {
                messageInputDom.childNodes.forEach((child) => {
                  if (child.nodeType === Node.TEXT_NODE) {
                    if (child.nodeValue && ChineseRegex.test(child.nodeValue)) {
                      isChineseFound = true
                      child.nodeValue = removeChineseCharacters(child.nodeValue)
                    }
                  }
                })
              }
              if (isChineseFound && messageInputDom) {
                messageInputDom.blur()
                setInvalidInputAlert(true)
              }
            }}
            onKeyDown={async (event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                let messageText: string | null | undefined =
                  event.currentTarget.textContent

                if (
                  imageList.length === 0 &&
                  (messageText === null ||
                    messageText === undefined ||
                    messageText.trim() === '')
                ) {
                  setMessageInputAlertType(1)
                  return
                }

                setIsGenerationgMessageText(true)

                const imgMessage = await generateImgMessage()

                messageText =
                  messageText === null ? imgMessage : messageText + imgMessage

                // Add dappDomain
                if (topLevelDomain !== undefined) {
                  messageText = `${messageText}%{ori:${topLevelDomain}}`
                }

                if (quotedMessage !== undefined) {
                  const quotedMessageStr = `${
                    quotedMessage.name ??
                    addressToUserName(quotedMessage.sender)
                  }: ${quotedMessage.message}`
                  messageText = `${messageText}%{quo:${quotedMessageStr}}`
                }

                setIsGenerationgMessageText(false)

                if (messageText === undefined) {
                  return
                }

                onSend(true)
                try {
                  const { messageSent, blockId } =
                    await messageDomain.sendMessageToGroup(groupId, messageText)

                  messageDomain.onSentMessage(messageSent)
                  onQuoteMessage(undefined)
                } catch (e) {
                  console.error(e)
                } finally {
                  onSend(false)
                  clearImg()
                }
              }
            }}
            style={{
              wordBreak: 'normal',
              overflowWrap: 'anywhere',
              whiteSpace: 'pre-wrap',
              maxHeight: 150,
              overflow: 'auto'
            }}
            contentEditable={true}
            className="bg-white dark:bg-[#212121] border-0 rounded py-1.5 text-sm pl-2.5 text-gray-900 dark:text-[#B0B0B0] placeholder:text-black/50 dark:text-white placeholder:text-sm outline-none select-text"
            placeholder="Type Message..."
          ></div>
          {quotedMessage && (
            <div className="flex w-full m-w-full overflow-hidden flex-row bg-white dark:bg-[#212122] rounded-lg mb-1 pl-2 py-[1px]">
              <div
                className={classNames(
                  ' flex-1 text-xs overflow-hidden dark:text-white'
                )}
              >
                <div className={classNames('font-medium mb-0.5')}>
                  {quotedMessage.name ??
                    addressToUserName(quotedMessage.sender)}
                </div>
                <div className={classNames('truncate')}>
                  <MessageViewer
                    message={quotedMessage.message}
                    groupId={groupId}
                    ifMessageIncludeOriginContent={true}
                    ifShowImg={true}
                  />
                </div>
              </div>
              <div
                className={classNames(
                  'flex-none w-ful cursor-pointer w-6 m-auto pl-2'
                )}
                onClick={() => {
                  onQuoteMessage(undefined)
                }}
              >
                <CancelSVG
                  className={classNames('stroke-black dark:stroke-white')}
                />
              </div>
            </div>
          )}
        </div>
        {/* <PlusSVG
          onClick={() => {
            setMessageInputAlertType(2)
          }}
          className={classNames(
            'flex-none cursor-pointer ml-2 dark:fill-white'
          )}
        /> */}
      </div>

      {messageInputAlertType && (
        <MessageInputAlert
          type={messageInputAlertType}
          hide={() => {
            setMessageInputAlertType(undefined)
            messageInputfocus()
          }}
        />
      )}
      {invalidInputAlert && (
        <div
          style={{
            width: 'calc(100% - 40px)',
            bottom: (messageInputRef.current?.clientHeight ?? 0) + 36 + 12
          }}
          className={classNames('absolute left-5')}
        >
          <div
            className={classNames(
              'flex w-full flex-row py-2.5 text-base bg-[#fee2e2] rounded-xl text-[#D53554]'
            )}
          >
            <img src={ErrorCircle} className={classNames('mx-3')} />
            <div className={'flex-1'}>
              <div>
                <span className={classNames('font-bold mr-1')}>Error:</span>
                <span>Invalid input</span>
              </div>
            </div>
            <img
              onClick={() => {
                setInvalidInputAlert(false)
              }}
              src={ErrorCancel}
              className={classNames('mr-3 cursor-pointer')}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// type 1: Unable to send blank message
// type 2: Coming soon, style tuned
function MessageInputAlert(props: { hide: () => void; type: number }) {
  const { hide, type } = props
  return (
    <Modal show={true} hide={hide}>
      <div
        className={classNames(
          'w-[334px] bg-white dark:bg-[#212122] rounded-2xl font-medium'
        )}
      >
        <div className={classNames('text-center dark:text-white pt-6 pb-8')}>
          {type === 1 && 'Unable to send blank message'}
          {type === 2 && 'Coming soon, stay tuned'}
        </div>
        <div
          className={classNames(
            'text-center border-t py-3 text-sky-400 cursor-pointer'
          )}
          onClick={hide}
        >
          OK
        </div>
      </div>
    </Modal>
  )
}
