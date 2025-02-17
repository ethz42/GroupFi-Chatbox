import { Link, useParams, useNavigate, useLocation } from 'react-router-dom'
import { classNames, addressToUserName, addressToPngSrcV2 } from 'utils'
// @ts-ignore
import QuestionSVG from 'public/icons/question.svg?react'
// @ts-ignore
import ArrowRightSVG from 'public/icons/arrrow-right.svg?react'
// @ts-ignore
import ViewMemberSVG from 'public/icons/view-member.svg?react'
// @ts-ignore
import MuteBigSVG from 'public/icons/mute-big.svg?react'
// @ts-ignore
import UnmuteSVG from 'public/icons/unmute.svg?react'
// @ts-ignore
import LikeSVG from 'public/icons/like.svg?react'
// @ts-ignore
import UnlikeSVG from 'public/icons/unlike.svg?react'
import MuteWhiteSVG from 'public/icons/mute-white.svg'
import LikedSVG from 'public/icons/liked.svg'
import {
  ContainerWrapper,
  HeaderWrapper,
  ContentWrapper,
  ReturnIcon,
  GroupTitle,
  Modal,
  usePopoverMouseEvent,
  GeneralTooltip
} from '../Shared'
import {
  GroupFiService,
  UserProfileInfo,
  useMessageDomain
} from 'groupfi-sdk-chat'
import { useEffect, useState } from 'react'
import { Loading, AsyncActionWrapper, ButtonLoading } from 'components/Shared'
import {
  useGroupMembers,
  useGroupIsPublic,
  getGroupIsPublicSwrKey,
  useOneBatchUserProfile
} from 'hooks'
import { useSWRConfig } from 'swr'

import useUserBrowseMode from 'hooks/useUserBrowseMode'
import useGroupMeta from 'hooks/useGroupMeta'
import { IMUserLikeGroupMember, IMUserMuteGroupMember } from 'groupfi-sdk-core'
import { Name, Avatar } from 'components/Shared'

const maxShowMemberNumber = 15

export function GroupInfo(props: { groupId: string }) {
  const { messageDomain } = useMessageDomain()
  const groupFiService = messageDomain.getGroupFiService()

  const { groupId } = props

  const groupIdWithHexPrefix = groupFiService.addHexPrefixIfAbsent(groupId)

  const currentAddress = groupFiService.getCurrentAddress()

  const { memberAddresses, isLoading } = useGroupMembers(groupId)

  const { userProfileMap } = useOneBatchUserProfile(memberAddresses ?? [])

  const isUserBrowseMode = useUserBrowseMode()

  const [allLikedUsers, setAllLikedUsers] = useState<IMUserLikeGroupMember[]>(
    []
  )

  const [allMutedUsers, setAllMutedUsers] = useState<IMUserMuteGroupMember[]>(
    []
  )

  const fetchAllLikedUsers = async () => {
    const res = await groupFiService.getAllUserLikeGroupMembers()
    setAllLikedUsers(res)
  }

  const fetchAllMutedUsers = async () => {
    const res = await groupFiService.getAllUserMuteGroupMembers()
    setAllMutedUsers(res)
  }

  useEffect(() => {
    if (!isUserBrowseMode) {
      fetchAllLikedUsers()
      fetchAllMutedUsers()
    }
  }, [isUserBrowseMode])

  const isGroupMember =
    (memberAddresses ?? []).find((address) => address === currentAddress) !==
    undefined

  const location = useLocation()
  const groupUrl = location.pathname.replace('/info', '')

  if (isLoading) {
    return <Loading />
  }

  return (
    <ContainerWrapper>
      <HeaderWrapper>
        <ReturnIcon backUrl={groupUrl} />
        <GroupTitle
          showGroupPrivateIcon={false}
          title={`Group (${(memberAddresses ?? []).length})`}
        />
      </HeaderWrapper>
      <ContentWrapper
        customizedClass={classNames('flex flex-col justify-between')}
      >
        <div>
          {memberAddresses !== undefined && memberAddresses.length > 0 && (
            <div
              className={classNames('grid gap-y-2 px-15px pt-5 pb-3')}
              style={{
                gridTemplateColumns: 'repeat(auto-fill, minmax(62px, 1fr))'
              }}
            >
              {(memberAddresses.length > maxShowMemberNumber
                ? memberAddresses.slice(0, maxShowMemberNumber)
                : memberAddresses
              ).map((memberAddress, index) => {
                const memberSha256Hash =
                  groupFiService.sha256Hash(memberAddress)
                const isSameMember = (
                  member: IMUserLikeGroupMember | IMUserMuteGroupMember
                ) =>
                  member.groupId === groupIdWithHexPrefix &&
                  member.addrSha256Hash === memberSha256Hash
                const isLiked = allLikedUsers.find(isSameMember)
                const isMuted = allMutedUsers.find(isSameMember)
                const addMember = (
                  old: IMUserLikeGroupMember[] | IMUserMuteGroupMember[]
                ) => [
                  ...old,
                  {
                    groupId: groupIdWithHexPrefix,
                    addrSha256Hash: memberSha256Hash
                  }
                ]
                const removeMember = (
                  old: IMUserLikeGroupMember[] | IMUserMuteGroupMember[]
                ) =>
                  old.filter(
                    (m) =>
                      m.groupId !== groupIdWithHexPrefix ||
                      m.addrSha256Hash !== memberSha256Hash
                  )

                return (
                  <Member
                    groupId={groupId}
                    isGroupMember={isGroupMember}
                    userProfile={userProfileMap?.get(memberAddress)}
                    isLiked={!!isLiked}
                    isMuted={!!isMuted}
                    groupFiService={groupFiService}
                    address={memberAddress}
                    key={memberAddress}
                    isLastOne={(index + 1) % 5 === 0}
                    name={addressToUserName(memberAddress)}
                    currentAddress={currentAddress}
                    likeOperationCallback={async () => {
                      setAllLikedUsers(isLiked ? removeMember : addMember)
                      fetchAllLikedUsers()
                    }}
                    muteOperationCallback={async () => {
                      setAllMutedUsers(isMuted ? removeMember : addMember)
                      fetchAllMutedUsers()
                    }}
                  />
                )
              })}
            </div>
          )}
          {(memberAddresses ?? []).length > maxShowMemberNumber && (
            <ViewMoreMembers groupId={groupId} />
          )}
          <div
            className={classNames(
              'mx-5 border-t border-black/10 dark:border-[#eeeeee80] py-4'
            )}
          >
            <GroupStatus
              isGroupMember={isGroupMember}
              groupId={groupId}
              groupFiService={groupFiService}
            />
          </div>
          {isGroupMember && (
            <div
              className={classNames(
                'mx-5 border-t border-black/10 dark:border-[#eeeeee80] py-4'
              )}
            >
              <ReputationInGroup
                groupId={groupId}
                groupFiService={groupFiService}
              />
            </div>
          )}
        </div>
        <div>
          {!isUserBrowseMode && (
            <LeaveOrUnMark
              groupId={groupId}
              isGroupMember={isGroupMember}
              groupFiService={groupFiService}
            />
          )}
        </div>
      </ContentWrapper>
    </ContainerWrapper>
  )
}

export function Member(props: {
  isLastOne: boolean
  name: string
  address: string
  isGroupMember: boolean
  currentAddress: string | undefined
  groupId: string
  isLiked: boolean
  isMuted: boolean
  groupFiService: GroupFiService
  userProfile?: UserProfileInfo
  likeOperationCallback: () => Promise<void>
  muteOperationCallback: () => Promise<void>
}) {
  const {
    address,
    isLastOne,
    currentAddress,
    isGroupMember,
    name,
    isLiked,
    isMuted,
    likeOperationCallback,
    muteOperationCallback,
    groupId,
    userProfile
  } = props
  const { messageDomain } = useMessageDomain()

  const groupFiService = messageDomain.getGroupFiService()

  const avatar = !!userProfile?.avatar
    ? userProfile?.avatar
    : addressToPngSrcV2(groupFiService.sha256Hash(address))

  const navigate = useNavigate()
  const [menuShow, setMenuShow] = useState(false)

  const isGroupMemberAndNotSelf = isGroupMember && address !== currentAddress
  const location = useLocation()
  return (
    <div
      className={classNames('relative')}
      onMouseLeave={() => {
        if (menuShow) {
          setMenuShow(false)
        }
      }}
    >
      <div className={classNames('w-14 cursor-pointer m-auto')}>
        <div className={classNames('relative')}>
          <Avatar
            address={address}
            avatar={userProfile?.avatar}
            className={classNames('rounded-lg w-full h-14 object-cover')}
            onClick={() => {
              setMenuShow((s) => !s)
            }}
          />
          {/* <img
            onClick={() => {
              setMenuShow((s) => !s)
            }}
            className={classNames('rounded-lg w-full h-14 object-cover')}
            src={avatar}
          /> */}
          {isMuted ? (
            <img
              className={classNames('absolute right-0 bottom-0')}
              src={MuteWhiteSVG}
            />
          ) : isLiked ? (
            <img
              className={classNames('absolute right-0 bottom-0')}
              src={LikedSVG}
            />
          ) : null}
        </div>
        <p
          className={classNames(
            'text-xs dark:text-white opacity-50 text-center mt-1 truncate'
          )}
        >
          <Name name={userProfile?.name ?? name} address={address} />
          {/* {userProfile?.name ?? name} */}
        </p>
      </div>
      <div
        className={classNames(
          'absolute left-0 min-w-[88px] top-[50px] z-10 mt-2 origin-top-right divide-y divide-gray-100 rounded-md bg-white dark:bg-[#3C3D3F] shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none',
          menuShow ? 'block' : 'hidden',
          isLastOne ? 'left-[-16px]' : 'left-0'
        )}
      >
        {[
          {
            text: 'View',
            onClick: () => {
              navigate({
                pathname: `/user/${address}`,
                search: `?from=${encodeURIComponent(location.pathname)}`
              })
            },
            icon: (
              <ViewMemberSVG
                className={classNames(
                  'h-[18px] absolute top-4 text-black dark:text-white'
                )}
              />
            ),
            async: false
          },
          ...(isGroupMemberAndNotSelf
            ? [
                {
                  text: isLiked ? 'Unlike' : 'Like',
                  onClick: async () => {
                    await messageDomain.likeOrUnLikeGroupMember(
                      groupId,
                      address,
                      !isLiked
                    )
                  },
                  icon: isLiked ? (
                    <UnlikeSVG
                      className={classNames(
                        'h-[18px] absolute top-4 text-black dark:text-white'
                      )}
                    />
                  ) : (
                    <LikeSVG
                      className={classNames(
                        'h-[18px] absolute top-4 text-black dark:text-white'
                      )}
                    />
                  ),
                  async: true,
                  onCallback: likeOperationCallback
                },
                {
                  text: isMuted ? 'Unmute' : 'Mute',
                  onClick: async () => {
                    if (isMuted) {
                      await messageDomain.muteOrUnmuteGroupMember(
                        groupId,
                        address,
                        false
                      )
                    } else {
                      await messageDomain.muteOrUnmuteGroupMember(
                        groupId,
                        address,
                        true
                      )
                    }
                  },
                  icon: isMuted ? (
                    <UnmuteSVG
                      className={classNames(
                        'h-[18px] absolute top-4 text-black dark:text-white'
                      )}
                    />
                  ) : (
                    <MuteBigSVG
                      className={classNames(
                        'h-[18px] absolute top-4 text-black dark:text-white'
                      )}
                    />
                  ),
                  async: true,
                  onCallback: muteOperationCallback
                }
              ]
            : [])
        ].map(({ text, onClick, icon, async, onCallback }, index) => (
          <AsyncActionWrapper
            onClick={onClick}
            async={async}
            key={index}
            onCallback={() => {
              if (onCallback) {
                onCallback()
              }
            }}
          >
            <div
              className={classNames(
                'text-sm py-3.5 px-3 cursor-pointer relative dark:text-white'
              )}
            >
              {icon}
              <span className={classNames('pl-7 font-medium')}>{text}</span>
            </div>
          </AsyncActionWrapper>
        ))}
      </div>
    </div>
  )
}

function ViewMoreMembers(props: { groupId: string }) {
  const { groupId } = props
  return (
    <div className={classNames('text-center mb-5')}>
      <Link to={`/group/${groupId}/members`}>
        <span
          className={classNames(
            'inline-flex flex-row justify-center items-center text-sm text-black/50 dark:text-[#B0B0B0]/50 cursor-pointer'
          )}
        >
          View More Members
          <ArrowRightSVG
            className={classNames(
              'ml-1 mt-px text-[#333]/30 dark:text-[#B0B0B0]'
            )}
          />
        </span>
      </Link>
    </div>
  )
}

function GroupStatus(props: {
  isGroupMember: boolean
  groupId: string
  groupFiService: GroupFiService
}) {
  const { groupId, groupFiService } = props
  const { mutate } = useSWRConfig()

  const { isPublic, isLoading, isValidating } = useGroupIsPublic(groupId)

  const refetch = () => {
    mutate(getGroupIsPublicSwrKey(groupId))
  }

  return (
    <div className={classNames('flex flex-row')}>
      <div className={classNames('flex-1 dark:text-white')}>Group Status</div>
      <div className={classNames('flex-none dark:text-white')}>
        {isLoading ? 'loading...' : isPublic ? 'Public' : 'Private'}
      </div>
      {props.isGroupMember && (
        <Vote
          groupId={groupId}
          refresh={refetch}
          groupFiService={groupFiService}
        />
      )}
    </div>
  )
}

function Vote(props: {
  groupId: string
  refresh: () => void
  groupFiService: GroupFiService
}) {
  const { messageDomain } = useMessageDomain()
  const { groupId, refresh, groupFiService } = props

  const [votesCount, setVotesCount] = useState<{
    0: number
    1: number
  }>()

  const [voteRes, setVoteRes] = useState<0 | 1>()

  const [menuShow, setMenuShow] = useState(false)

  const [onMouseEnter, onMouseLeave] = usePopoverMouseEvent(
    menuShow,
    () => setMenuShow(true),
    () => setMenuShow(false)
  )

  const getVoteResAndvotesCount = async () => {
    const groupVotesCount = await groupFiService.loadGroupVotesCount(groupId)
    console.log('***groupVotesCount', groupVotesCount)
    const voteRes = (await groupFiService.getGroupVoteRes(groupId)) as
      | 0
      | 1
      | undefined
    setVotesCount({
      0: groupVotesCount.publicCount,
      1: groupVotesCount.privateCount
    })
    setVoteRes(voteRes)
  }

  useEffect(() => {
    getVoteResAndvotesCount()
  }, [])

  const onVote = async (vote: 0 | 1) => {
    try {
      let res:
        | {
            outputId: string
          }
        | undefined = undefined
      if (voteRes === vote) {
        console.log('$$$unvote start')
        // unvote
        res = await messageDomain.voteOrUnVoteGroup(groupId, undefined)
        setVotesCount((s) => {
          if (s === undefined) {
            return s
          }
          return {
            ...s,
            [vote]: s[vote] - 1
          }
        })
        setVoteRes(undefined)
        console.log('$$$unvote end')
      } else {
        console.log('$$$vote start:', vote)
        // vote
        res = await messageDomain.voteOrUnVoteGroup(groupId, vote)
        setVotesCount((s) => {
          if (s === undefined) {
            return s
          }
          if (voteRes === undefined) {
            return {
              ...s,
              [vote]: s[vote] + 1
            }
          } else {
            return {
              ...s,
              [voteRes]: s[voteRes] - 1,
              [vote]: s[vote] + 1
            }
          }
        })
        setVoteRes(vote)
        console.log('$$$vote end:', vote)
      }
      if (res?.outputId !== undefined) {
        groupFiService.waitOutput(res.outputId).then(() => {
          if (refresh) {
            refresh()
          }
        })
      }
      console.log('***res', res)
    } catch (error) {
      console.log('***onVote Error', error)
    }
  }

  return (
    <div className="relative">
      <div>
        <div
          className={classNames(
            'flex-none ml-4 text-accent-600 dark:text-accent-500 cursor-pointer'
          )}
          onMouseOver={onMouseEnter}
          onMouseLeave={onMouseLeave}
        >
          VOTE
        </div>
      </div>
      <div
        className={classNames(
          'absolute right-0 w-24 z-10 mt-2 origin-top-right divide-y divide-gray-100 dark:divide-[#eeeeee80] rounded-md bg-white dark:bg-[#3d3e3f] shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none',
          menuShow ? 'block' : 'hidden'
        )}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {[
          {
            text: 'Public',
            value: 0,
            number: votesCount?.['0'] ?? ''
          },
          {
            text: 'Private',
            value: 1,
            number: votesCount?.['1'] ?? ''
          }
        ].map(({ text, number, value }) => (
          <AsyncActionWrapper
            key={value}
            onClick={() => {
              return onVote(value as 0 | 1)
            }}
          >
            <div
              className={classNames(
                'text-sm py-3.5 px-3 flex cursor-pointer',
                voteRes === value
                  ? 'text-accent-600 dark:text-accent-500'
                  : 'text-[#333] dark:text-white'
              )}
            >
              {text}
              <span
                className={classNames(
                  'w-[18px] h-[18px] text-center ml-[auto] font-medium'
                )}
              >
                {number}
              </span>
            </div>
          </AsyncActionWrapper>
        ))}
      </div>
    </div>
  )
}

function ReputationInGroup(props: {
  groupId: string
  groupFiService: GroupFiService
}) {
  const { groupId, groupFiService } = props
  const [reputation, setReputation] = useState<number>()

  const getReputation = async () => {
    try {
      const res = await groupFiService.getUserGroupReputation(groupId)
      console.log('****Get Reputation', res)
      setReputation(res.reputation)
    } catch (error) {
      console.log('****Get Reputation error', error)
    }
  }

  useEffect(() => {
    getReputation()
  }, [])

  return (
    <div className={classNames('flex flex-row')}>
      <div className={classNames('flex-1 dark:text-white')}>
        <span className={classNames('mr-2')}>My Reputation in Group</span>
        <GeneralTooltip
          message="Spamming results in blocks and reputation loss, leading to group removal."
          toolTipContentWidth={160}
          width={20}
          height={20}
        >
          <QuestionSVG
            className={classNames(
              'inline-block align-sub cursor-pointer dark:fill-white'
            )}
          />
        </GeneralTooltip>
      </div>
      <div className={classNames('flex-none ml-4 font-medium dark:text-white')}>
        {reputation ?? ''}
      </div>
    </div>
  )
}

function LeaveOrUnMark(props: {
  groupId: string
  isGroupMember: boolean
  groupFiService: GroupFiService
}) {
  const { messageDomain } = useMessageDomain()
  const { groupId, isGroupMember, groupFiService } = props

  const navigate = useNavigate()

  const [modalShow, setModalShow] = useState(false)

  const [isSubscribing, setIsSubscribing] = useState(false)

  const [addressStatus, setAddressStatus] = useState<{
    marked: boolean
    muted: boolean
    isQualified: boolean
  }>()

  const { isPublic } = useGroupIsPublic(groupId)

  const fetchAddressStatus = async () => {
    const status = await groupFiService.getAddressStatusInGroup(groupId)
    setAddressStatus(status)
  }

  useEffect(() => {
    fetchAddressStatus()
  }, [])

  const hide = () => {
    setModalShow(false)
  }

  const onLeave = async () => {
    if (isGroupMember) {
      await messageDomain.leaveGroup(groupId)
    } else {
      await messageDomain.unMarkGroup(groupId)
    }

    navigate('/')
  }

  if (addressStatus === undefined || isPublic === undefined) {
    return null
  }

  // private group but is not a group member, show nothing
  if (!isGroupMember && !isPublic) {
    return null
  }

  // public group and qualified but is not a group member, show nothing
  if (!isGroupMember && isPublic && addressStatus.isQualified) {
    return null
  }

  // if (!marked && !isGroupMember) {
  //   return null
  // }

  // const text = isGroupMember
  //   ? { verb: 'Leave', verbing: 'Leaving' }
  //   : marked
  //   ? { verb: 'Unsubscribe', verbing: 'Unsubscribing' }
  //   : undefined

  const isGroupMemberOrMarked = isGroupMember || addressStatus.marked
  const isPublicGroupAndNotMarked =
    isPublic === true && addressStatus.marked === false

  const text = isGroupMemberOrMarked
    ? { verb: 'Leave', verbing: 'Leaving' }
    : isPublicGroupAndNotMarked
    ? { verb: 'Subscribe', verbing: 'Subscribing' }
    : undefined

  const isSubscribeBtn = isPublicGroupAndNotMarked

  return (
    <>
      <div className={classNames('left-0 bottom-0 w-full px-5 text-center')}>
        <div
          className={classNames(
            'flex flex-row justify-center border-t border-black/10 dark:border-[#eeeeee80] pt-4 pb-5 text-[#D53554] text-sm cursor-pointer',
            isSubscribeBtn ? 'text-accent-600 dark:text-accent-500' : ''
          )}
          onClick={async () => {
            if (isSubscribeBtn) {
              setIsSubscribing(true)
              await messageDomain.markGroup(groupId)
              navigate(-1)
              return
            }
            setModalShow((s) => !s)
          }}
        >
          {isSubscribing ? (
            <>
              <ButtonLoading classes={classNames('loader-spinner-sm mr-1')} />
              <span>{text?.verbing}</span>
            </>
          ) : (
            text?.verb
          )}
        </div>
      </div>
      <Modal show={modalShow} hide={hide}>
        <LeaveOrUnMarkDialog
          hide={hide}
          groupId={groupId}
          text={text}
          onLeave={onLeave}
          groupFiService={groupFiService}
        />
      </Modal>
    </>
  )
}

function LeaveOrUnMarkDialog(props: {
  hide: () => void
  groupId: string
  onLeave: () => Promise<void>
  groupFiService: GroupFiService
  text:
    | {
        verb: string
        verbing: string
      }
    | undefined
}) {
  const { hide, groupId, text, onLeave } = props

  const [loading, setLoading] = useState(false)

  const { groupName } = useGroupMeta(groupId)

  return (
    <div
      className={classNames(
        'w-[334px] bg-white dark:bg-[#212121] rounded-2xl p-4'
      )}
    >
      <div className={classNames('text-center font-medium dark:text-white')}>
        {text?.verbing} Group Chat “{groupName}”
      </div>
      <div className={classNames('mt-4 flex font-medium justify-between')}>
        {[
          {
            text: 'Cancel',
            onClick: () => {
              hide()
            },
            className: 'bg-[#F2F2F7] dark:bg-white bg:text-black'
          },
          {
            text: loading ? 'Loading...' : text?.verb,
            onClick: async () => {
              try {
                setLoading(true)
                await onLeave()
                console.log('***Leave group')
              } catch (error) {
                console.log('***Leave group error', error)
              } finally {
                setLoading(false)
                hide()
              }
            },
            className: 'bg-[#D53554] text-white'
          }
        ].map(({ text, onClick, className }, index) => (
          <button
            key={index}
            className={classNames(
              'w-[143px] text-center py-3 rounded-[10px]',
              className
            )}
            onClick={() => {
              if (loading) {
                return
              }
              onClick()
            }}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  )
}

export default () => {
  const params = useParams()
  const groupId = params.id
  if (!groupId) {
    return null
  }
  return <GroupInfo groupId={groupId} />
}
