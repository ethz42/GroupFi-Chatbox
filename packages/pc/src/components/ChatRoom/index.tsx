import { classNames } from 'utils'
// @ts-ignore
import EmojiSVG from 'public/icons/emoji.svg?react'
// @ts-ignore
import MuteRedSVG from 'public/icons/mute-red.svg?react'
// @ts-ignore
import WarningSVG from 'public/icons/warning.svg?react'

import {
  ContainerWrapper,
  HeaderWrapper,
  ReturnIcon,
  HomeIcon,
  MoreIcon,
  GroupTitle,
  AppLoading
} from '../Shared'

import { useSearchParams, useParams, useNavigate } from 'react-router-dom'
import EmojiPicker, { EmojiStyle, EmojiClickData } from 'emoji-picker-react'
import {
  useEffect,
  useState,
  useRef,
  useCallback,
  Fragment,
  useMemo
} from 'react'
import {
  useMessageDomain,
  IMessage,
  EventGroupMemberChanged,
  GroupFiService,
  HeadKey
} from 'groupfi-sdk-chat'

import { useAppDispatch, useAppSelector } from 'redux/hooks'
import useMyGroupConfig from 'hooks/useMyGroupConfig'

import { RowVirtualizerDynamic } from './VirtualList'

import MessageInput from './MessageInput'
import useWalletConnection from 'hooks/useWalletConnection'
import useUserBrowseMode from 'hooks/useUserBrowseMode'
import useRegistrationStatus from 'hooks/useRegistrationStatus'
import {
  getLocalParentStorage,
  GROUP_INFO_KEY,
  removeLocalParentStorage,
  setLocalParentStorage
} from 'utils/storage'
import useGroupMeta from 'hooks/useGroupMeta'
import useIncludesAndExcludes from 'hooks/useIncludesAndExcludes'
import { changeActiveTab } from 'redux/appConfigSlice'
import { useGroupIsPublic } from 'hooks'

export interface QuotedMessage {
  sender: string
  message: string
  name?: string
}

export function ChatRoom(props: { groupId: string; isBrowseMode: boolean }) {
  const { groupId, isBrowseMode } = props
  const { groupName } = useGroupMeta(groupId)

  const { messageDomain } = useMessageDomain()
  const groupFiService = messageDomain.getGroupFiService()

  const isAnnouncement = messageDomain.isAnnouncementGroup(groupId)

  const [searchParams] = useSearchParams()
  const isHomeIcon = searchParams.get('home')

  const isWalletConnected = useWalletConnection()

  const isPublic = useIsPublic(groupId)

  const tailDirectionAnchorRef = useRef<{
    directionMostMessageId?: string
    chunkKeyForDirectMostMessageId?: string
  }>({})

  const fetchingMessageRef = useRef<{
    fetchingOldData: boolean
    fetchingNewData: boolean
  }>({
    fetchingOldData: false,
    fetchingNewData: false
  })

  const [messageList, setMessageList] = useState<
    Array<IMessage | EventGroupMemberChanged>
  >([])

  const fetchMessageToTailDirection = async (
    size: number = 20
  ): Promise<number> => {
    if (fetchingMessageRef.current.fetchingOldData) {
      return 0
    }
    fetchingMessageRef.current.fetchingOldData = true
    console.log(
      '====>fetchMessageToTailDirection',
      tailDirectionAnchorRef.current
    )
    const { chunkKeyForDirectMostMessageId, directionMostMessageId } =
      tailDirectionAnchorRef.current
    try {
      const { messages, ...rest } =
        await messageDomain.getConversationMessageList({
          groupId,
          key: chunkKeyForDirectMostMessageId ?? HeadKey,
          messageId: directionMostMessageId,
          direction: 'tail',
          size
        })
      console.log('====> fetchMessageToTailDirection', { ...messages }, rest)
      tailDirectionAnchorRef.current.chunkKeyForDirectMostMessageId =
        rest.chunkKeyForDirectMostMessageId
      if (rest.directionMostMessageId) {
        tailDirectionAnchorRef.current.directionMostMessageId =
          rest.directionMostMessageId
      }

      if (messages.length > 0) {
        const latestMessageId = messages[0].messageId

        if (
          headDirectionAnchorRef.current.directionMostMessageId === undefined
        ) {
          setMessageList((prev) => [...prev, ...messages.reverse()])
        } else {
          // messages is toward tail direction, so reverse it, then prepend to messageList
          setMessageList((prev) => [...messages.reverse(), ...prev])
        }

        if (
          headDirectionAnchorRef.current.directionMostMessageId === undefined
        ) {
          console.log(
            '====> fetchMessageToTailDirection set headDirectionAnchorRef',
            latestMessageId
          )
          headDirectionAnchorRef.current.directionMostMessageId =
            latestMessageId
        }
      }
      return messages.length
    } catch (e) {
      console.error(e)
      return 0
    } finally {
      fetchingMessageRef.current.fetchingOldData = false
    }
  }

  const headDirectionAnchorRef = useRef<{
    directionMostMessageId?: string
    chunkKeyForDirectMostMessageId?: string
  }>({})

  const fetchMessageToHeadDirection = async (size: number = 20) => {
    if (fetchingMessageRef.current.fetchingNewData) {
      return
    }
    if (headDirectionAnchorRef.current.directionMostMessageId === undefined) {
      return
    }
    fetchingMessageRef.current.fetchingNewData = true

    const { chunkKeyForDirectMostMessageId, directionMostMessageId } =
      headDirectionAnchorRef.current

    try {
      const { messages, ...rest } =
        await messageDomain.getConversationMessageList({
          groupId,
          key: chunkKeyForDirectMostMessageId ?? HeadKey,
          messageId: directionMostMessageId,
          direction: 'head',
          size: 5
        })

      console.log(
        '====>messages in fetchMessageToHeadDirection',
        {
          ...messages
        },
        rest
      )
      headDirectionAnchorRef.current.chunkKeyForDirectMostMessageId =
        rest.chunkKeyForDirectMostMessageId
      if (rest.directionMostMessageId) {
        console.log(
          '====> fetchMessageToHeadDirection set directionMostMessageId',
          rest.directionMostMessageId
        )
        headDirectionAnchorRef.current.directionMostMessageId =
          rest.directionMostMessageId
      }

      setMessageList((prev) => [...prev, ...messages])
    } catch (e) {
      console.error(e)
    } finally {
      fetchingMessageRef.current.fetchingNewData = false
    }
  }

  const fetchMessageToHeadDirectionWrapped = useCallback(async () => {
    if (headDirectionAnchorRef.current.directionMostMessageId === undefined) {
      await fetchMessageToTailDirection(20)
    } else {
      await fetchMessageToHeadDirection()
    }
  }, [groupId])

  const fetchMessageToTailDirectionWrapped = useCallback(
    async (size: number = 40) => {
      return await fetchMessageToTailDirection(size)
    },
    [groupId]
  )

  const onGroupMemberChanged = useCallback(
    (groupMemberChangedEvent: EventGroupMemberChanged) => {
      if (
        groupMemberChangedEvent.groupId ===
          groupFiService.addHexPrefixIfAbsent(groupId) &&
        groupMemberChangedEvent.isNewMember
      ) {
        setMessageList((prev) => [...prev, groupMemberChangedEvent])
      }
    },
    [groupId]
  )

  const init = useCallback(async () => {
    await fetchMessageToTailDirection(40)
    messageDomain.onConversationDataChanged(
      groupId,
      fetchMessageToHeadDirectionWrapped
    )
    messageDomain.onGroupMemberChanged(onGroupMemberChanged)
  }, [groupId])

  const deinit = () => {
    messageDomain.offGroupMemberChanged(onGroupMemberChanged)
    messageDomain.offConversationDataChanged(
      groupId,
      fetchMessageToHeadDirectionWrapped
    )
    messageDomain.offIsHasPublicKeyChanged(
      isHasPublicKeyChangedCallbackRef.current
    )
    messageDomain.navigateAwayFromGroup(groupId)
  }

  const [addressStatus, setAddressStatus] = useState<{
    // isGroupPublic: boolean
    marked: boolean
    muted: boolean
    isQualified: boolean
    isHasPublicKey: boolean
  }>()

  const isHasPublicKeyChangedCallbackRef = useRef<
    (param: { isHasPublicKey: boolean }) => void
  >(() => {})
  const fetchAddressStatus = async () => {
    console.log('entering fetchAddressStatus')
    try {
      const status = await groupFiService.getAddressStatusInGroup(groupId)
      const isHasPublicKey = messageDomain.getIsHasPublicKey()
      const appStatus = {
        ...status,
        isHasPublicKey
      }
      isHasPublicKeyChangedCallbackRef.current = (value) => {
        const { isHasPublicKey } = value ?? {}
        setAddressStatus((prev) => {
          if (prev !== undefined) {
            return { ...prev, isHasPublicKey }
          }
          return prev
        })
      }
      messageDomain.onIsHasPublicKeyChanged(
        isHasPublicKeyChangedCallbackRef.current
      )
      setAddressStatus(appStatus)
    } catch (e) {
      console.error(e)
    }
  }

  const refresh = useCallback(() => {
    setAddressStatus((s) =>
      s !== undefined ? { ...s, marked: true } : undefined
    )
  }, [addressStatus])

  const enteringGroup = async () => {
    await messageDomain.enteringGroupByGroupId(groupId)
    messageDomain.clearUnreadCount(groupId)
  }

  useEffect(() => {
    init()
    if (isWalletConnected) {
      fetchAddressStatus()
    }
    enteringGroup()

    return () => {
      setMessageList([])
      tailDirectionAnchorRef.current = {}
      fetchingMessageRef.current = {
        fetchingOldData: false,
        fetchingNewData: false
      }
      headDirectionAnchorRef.current = {}
      setQuotedMessage(undefined)
      deinit()
    }
  }, [groupId])

  const [isSending, setIsSending] = useState(false)

  const [quotedMessage, setQuotedMessage] = useState<QuotedMessage | undefined>(
    undefined
  )

  const isRegistered = useRegistrationStatus()
  const renderChatRoomButtonForAllCase = () => {
    if (!isWalletConnected) {
      return <ChatRoomWalletConnectButton />
    }
    if (!isRegistered) {
      return <ChatRoomBrowseModeButton />
    }

    if (addressStatus === undefined) {
      return <ChatRoomLoadingButton />
    }

    if (isAnnouncement && !addressStatus.isQualified) {
      return null
    }

    if (
      addressStatus.marked &&
      addressStatus.isQualified &&
      !addressStatus.muted
    ) {
      if (isSending) {
        return <ChatRoomSendingButton />
      }
      return (
        <MessageInput
          onQuoteMessage={setQuotedMessage}
          groupId={groupId}
          onSend={setIsSending}
          quotedMessage={quotedMessage}
        />
      )
    }

    return (
      <div className={classNames('h-12')}>
        <ChatRoomButton
          groupId={groupId}
          marked={addressStatus.marked}
          muted={addressStatus.muted}
          qualified={addressStatus.isQualified}
          isHasPublicKey={addressStatus.isHasPublicKey}
          refresh={refresh}
          groupFiService={groupFiService}
        />
      </div>
    )
  }

  const isAccessRequired = useMemo(() => {
    if (isPublic === undefined) {
      return undefined
    }
    if (isPublic === true) {
      return false
    }
    if (isBrowseMode) {
      return isPublic === false
    }
    if (addressStatus === undefined) {
      return undefined
    }
    const isMember = addressStatus.marked && addressStatus.isQualified
    return !isMember
  }, [isPublic, isBrowseMode, addressStatus])

  return (
    <ContainerWrapper>
      <HeaderWrapper>
        {isHomeIcon ? <HomeIcon /> : <ReturnIcon backUrl="/" />}
        <GroupTitle
          isAnnouncement={isAnnouncement}
          showAnnouncementIcon={isAnnouncement}
          showGroupPrivateIcon={isPublic === false}
          title={groupName}
        />
        <MoreIcon to={'info'} />
      </HeaderWrapper>
      <div
        className={classNames(
          'flex-1 overflow-x-hidden overflow-y-auto relative'
        )}
      >
        {isAccessRequired !== undefined ? (
          isAccessRequired ? (
            <AccessRequired />
          ) : messageList.length > 0 ? (
            <RowVirtualizerDynamic
              onQuoteMessage={setQuotedMessage}
              messageList={messageList.slice().reverse()}
              groupFiService={groupFiService}
              loadPrevPage={fetchMessageToTailDirectionWrapped}
              groupId={groupId}
            />
          ) : null
        ) : null}
      </div>
      <div className={classNames('flex-none basis-auto')}>
        <div className={classNames('px-5 pb-5')}>
          {renderChatRoomButtonForAllCase()}
        </div>
      </div>
    </ContainerWrapper>
  )
}

function AccessRequired() {
  return (
    <div
      className={classNames(
        'w-full h-full flex flex-col justify-center justify-items-center'
      )}
    >
      <div
        className={classNames(
          'text-base font-medium text-center dark:text-white'
        )}
      >
        This is a private Group
      </div>
      <div
        className={classNames(
          'text-center text-[#333] mt-1 text-sm dark:text-white'
        )}
      >
        Access required to view content
      </div>
    </div>
  )
}

export function TrollboxEmoji(props: {
  messageInputRef: React.MutableRefObject<HTMLDivElement | null>
  lastRange: Range | undefined
}) {
  const { messageInputRef, lastRange } = props
  const [show, setShow] = useState(false)

  const [bottom, setBottom] = useState(0)

  useEffect(() => {
    const clientHeight = messageInputRef.current?.clientHeight ?? 0
    setBottom(clientHeight + 36 + 12)
  }, [messageInputRef.current?.clientHeight])

  return (
    <>
      <EmojiSVG
        className={classNames('flex-none cursor-pointer mr-2 dark:fill-white')}
        onClick={() => setShow((s) => !s)}
      />
      {show && (
        <div
          // className={classNames('absolute left-5 bottom-[76px]')}
          className={classNames('absolute left-5')}
          style={{
            width: 'calc(100% - 40px)',
            height: `calc(100% - ${bottom + 10}px)`,
            bottom: bottom
          }}
        >
          <EmojiPicker
            width={'100%'}
            height={'100%'}
            emojiStyle={EmojiStyle.TWITTER}
            previewConfig={{
              showPreview: false
            }}
            skinTonesDisabled={true}
            onEmojiClick={function (
              emojiData: EmojiClickData,
              event: MouseEvent
            ) {
              console.log('selected emoji', emojiData)
              const { imageUrl, emoji, unified } = emojiData
              const img = document.createElement('img')
              img.src = imageUrl
              img.alt = emoji
              // img.dataset['tag'] = GroupFiEmojiTag
              // img.dataset['value'] = formGroupFiEmojiValue(unified)
              img.innerText = `%{emo:${unified}}`
              img.className = 'emoji_in_message_input'

              if (lastRange !== undefined) {
                lastRange.insertNode(img)
                lastRange.collapse(false)

                const selection = getSelection()
                selection!.removeAllRanges()
                selection!.addRange(lastRange)
              }

              setShow(false)
            }}
          />
        </div>
      )}
    </>
  )
}

function ChatRoomButtonLoading() {
  return (
    <div
      className={classNames(
        'loader-spinner loader-spinner-md text-accent-600 dark:text-accent-500'
      )}
    >
      <div></div>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
    </div>
  )
}

function ChatRoomLoadingButton(props: { label?: String }) {
  const { label } = props
  return (
    <button className={classNames('w-full rounded-2xl py-3 h-12')}>
      <div className={classNames('py-[7px] flex items-center justify-center')}>
        {!!label ? (
          <Fragment>
            <ChatRoomButtonLoading />
            <div
              className={classNames(
                'text-base font-bold text-[#333] dark:text-white ml-2'
              )}
            >
              {label}
            </div>
          </Fragment>
        ) : // <Loading marginTop="mt-0" type="dot-typing" />
        null}
      </div>
    </button>
  )
}

export function ChatRoomSendingButton() {
  return (
    <button
      className={classNames(
        'w-full h-12 rounded-2xl py-3 bg-[#F2F2F7] dark:bg-gray-700'
      )}
    >
      Sending...
    </button>
  )
}

function ChatRoomBrowseModeButton() {
  const { messageDomain } = useMessageDomain()
  return (
    <button
      onClick={() => {
        messageDomain.setUserBrowseMode(false)
      }}
      className={classNames(
        'w-full bg-accent-600 dark:bg-accent-500 h-12 rounded-2xl py-3 text-white'
      )}
    >
      Create Account
    </button>
  )
}
function ChatRoomWalletConnectButton() {
  return (
    <button
      className={classNames(
        'w-full h-12 rounded-2xl py-3 text-accent-600 dark:text-accent-500 cursor-default flex items-center justify-center'
      )}
    >
      <WarningSVG />
      <div className="ml-2 overflow-hidden whitespace-nowrap text-ellipsis">
        Connect your wallet to unlock more
      </div>
    </button>
  )
}
function ChatRoomButton(props: {
  groupId: string
  marked: boolean
  qualified: boolean
  muted: boolean
  isHasPublicKey: boolean
  refresh: () => void
  groupFiService: GroupFiService
}) {
  const { marked, qualified, muted, groupId, refresh, groupFiService } = props
  const { dappGroupId } = useGroupMeta(groupId)
  const { messageDomain } = useMessageDomain()
  const includesAndExcludes = useIncludesAndExcludes()
  const [loadingLabel, setLoadingLabel] = useState('')

  // const isJoinOrMark = !muted && (qualified || !marked)
  const isJoined = !muted && qualified

  const nodeInfo = useAppSelector((state) => state.appConifg.nodeInfo)
  const groupInfo = getLocalParentStorage(GROUP_INFO_KEY, nodeInfo)
  const buylink =
    includesAndExcludes?.find((e) => e.groupId === dappGroupId)?.buylink ||
    groupInfo?.buylink ||
    ''
  if (!!loadingLabel) {
    return <ChatRoomLoadingButton label={loadingLabel} />
  }

  return (
    <button
      className={classNames(
        'w-full rounded-2xl py-3 relative',
        // marked || muted ? 'bg-[#F2F2F7] dark:bg-gray-700' : 'bg-primary',
        // muted || marked ? 'bg-transparent' : 'bg-primary',
        isJoined ? 'bg-accent-500' : 'bg-transparent',
        !isJoined ? 'pointer-events-none cursor-default' : '',
        !!buylink
          ? 'rounded-xl border border-[#F2F2F7] dark:border-gray-700 pointer-events-auto cursor-default'
          : ''
      )}
      onClick={async () => {
        // if (qualified || !marked) {
        if (qualified) {
          // setLoading(true)
          setLoadingLabel('Joining in')
          await messageDomain.joinGroup(groupId)
          // setLoadingLabel(qualified ? 'Joining in' : 'Subscribing')
          // const promise = qualified
          //   ? messageDomain.joinGroup(groupId)
          //   : messageDomain.markGroup(groupId)

          // await promise
          refresh()
          setLoadingLabel('')
        }
      }}
    >
      <span
        className={classNames(
          'text-base',
          isJoined
            ? 'text-white'
            : muted
            ? 'text-[#D53554]'
            : 'text-accent-600 dark:text-accent-500'
          // muted ? 'text-[#D53554]' : marked ? 'text-[#3671EE]' : 'text-white'
        )}
      >
        {
          muted ? (
            <>
              <MuteRedSVG
                className={classNames('inline-block mr-3 mt-[-3px]')}
              />
              <span>You are muted in this group</span>
            </>
          ) : qualified ? (
            'JOIN'
          ) : (
            <MarkedContent
              groupFiService={groupFiService}
              groupId={groupId}
              buylink={buylink}
            />
          )
          // marked ? (
          //   <MarkedContent
          //     groupFiService={groupFiService}
          //     groupId={groupId}
          //     buylink={buylink}
          //   />
          // ) : (
          //   'SUBSCRIBE'
          // )
        }
      </span>
    </button>
  )
}

function MarkedContent(props: {
  groupId: string
  groupFiService: GroupFiService
  buylink: string
}) {
  const { groupFiService, groupId } = props

  const groupMeta = useGroupMeta(groupId)
  const {
    qualifyType,
    groupName,
    contractAddress,
    tokenThresValue,
    chainId,
    symbol,
    collectionName
  } = groupMeta
  const isToken: Boolean =
    qualifyType === 'token' && contractAddress !== undefined

  if (qualifyType === 'event') {
    return (
      <div className={classNames('flex items-center justify-center')}>
        <WarningSVG />
        <span
          className={classNames(
            'font-medium mx-1 inline-block truncate align-bottom'
          )}
        >
          {symbol}
        </span>
      </div>
    )
  }

  return (
    <div className={classNames('flex items-center justify-center')}>
      <WarningSVG />
      <span className={classNames('ml-2')}>Own</span>
      <span
        className={classNames(
          'font-medium mx-1 inline-block truncate align-bottom'
        )}
        style={{
          // maxWidth: `calc(100% - 210px)`
          maxWidth: !!props.buylink
            ? `calc(100% - 210px)`
            : `calc(100% - 140px)`
        }}
      >
        {qualifyType === 'nft'
          ? collectionName ?? groupName
          : isToken
          ? `${tokenThresValue} ${symbol}`
          : null}
      </span>
      <span>to speak</span>
      {!!props.buylink ? (
        <>
          <div className={'ml-16'}></div>
          <span
            className={classNames(
              'absolute z-10 cursor-pointer active:opacity-80 top-0 right-0 rounded-br-xl rounded-tr-xl h-[2.875rem] flex items-center justify-center w-[3.75rem] bg-accent-600 text-white text-base'
            )}
            onClick={() => {
              window.open(props.buylink)
            }}
          >
            BUY
          </span>
        </>
      ) : null}
    </div>
  )
}

export default () => {
  const navigate = useNavigate()
  const appDispatch = useAppDispatch()
  const myGroupConfig = useMyGroupConfig()
  const activeTab = useAppSelector((state) => state.appConifg.activeTab)
  const params = useParams()
  const groupId = params.id
  const nodeInfo = useAppSelector((state) => state.appConifg.nodeInfo)

  let dappGroupId = ''
  const includesAndExcludes = useIncludesAndExcludes()
  const { messageDomain } = useMessageDomain()
  if (groupId) {
    const groupMeta = messageDomain
      .getGroupFiService()
      .getGroupMetaByGroupId(groupId || '')
    dappGroupId = groupMeta?.dappGroupId || ''
  }
  const buylink =
    includesAndExcludes?.find((e) => e.groupId === dappGroupId)?.buylink || ''

  useEffect(() => {
    if (groupId) {
      setLocalParentStorage(GROUP_INFO_KEY, { groupId, buylink }, nodeInfo)
    }
    return () => {
      removeLocalParentStorage(GROUP_INFO_KEY, nodeInfo)
    }
  }, [groupId, buylink])

  const isBrowseMode = useUserBrowseMode()

  if (!groupId) {
    return null
  }

  // const browserMode = messageDomain.isUserBrowseMode()

  // Ensure that myGroups config data has been loaded.
  if (activeTab === 'ofMe') {
    if (isBrowseMode) {
      appDispatch(changeActiveTab('forMe'))
      navigate('/')
      return null
    } else {
      if (myGroupConfig === undefined || myGroupConfig.length === 0) {
        return <AppLoading />
      }
    }
  }

  return <ChatRoom groupId={groupId} isBrowseMode={isBrowseMode} />
}

function useIsPublic(groupId: string): boolean | undefined {
  const [searchParams] = useSearchParams()
  const isPublicStr = searchParams.get('isPublic')
  let isPublic =
    isPublicStr === 'true' ? true : isPublicStr === 'false' ? false : undefined

  const { isPublic: isPublicFromFetch } = useGroupIsPublic(
    groupId,
    // isPublic !== undefined, Actually not fetch
    isPublic !== undefined
  )

  return isPublic ?? isPublicFromFetch
}
