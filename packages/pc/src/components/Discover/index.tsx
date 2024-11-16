import React, { useState, useEffect } from 'react';
import { classNames } from 'utils';
import { ethers } from 'ethers';
import CONTRACT_ABIS from 'contracts/abis';
import CONTRACT_ADDRESSES from 'contracts/address'
import { formatNumber } from 'utils/format';

interface Tab {
  id: string;
  name: string;
  chainId: string;
  description: string;
}

interface GroupChat {
  id: string;
  imageUrl: string;
  title: string;
  description: string;
  activeOnChain: string;
  members: string;
}

interface ContractResponse {
  success: boolean;
  data?: string;
  error?: Error;
}

const GroupChatCard: React.FC<GroupChat> = ({ imageUrl, title, description, activeOnChain, members }) => (
  <div className="border border-gray-200 dark:border-gray-700 rounded-2xl p-8 hover:shadow-lg transition-all duration-300 hover:scale-[1.01] bg-white dark:bg-gray-800 w-[400px]">
    <div className="flex flex-col items-center">
      <img
        src={imageUrl}
        alt={title}
        className="w-32 h-32 rounded-full object-cover shadow-md"
      />
      <h3 className="text-2xl font-bold mt-6 dark:text-white">{title}</h3>
      <p className="text-base text-gray-600 dark:text-gray-400 text-center w-full mt-4 max-w-[320px]">{description}</p>
    </div>
    <div className="flex justify-between mt-8 text-base font-medium max-w-[320px] mx-auto w-full">
      <span className="flex items-center text-gray-600 dark:text-gray-300">
        <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
        {activeOnChain} active
      </span>
      <span className="flex items-center text-gray-600 dark:text-gray-300">
        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
        </svg>
        {members}
      </span>
    </div>
  </div>
);

const Discover: React.FC = () => {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTab, setActiveTab] = useState<string>('');
  const [groupChats, setGroupChats] = useState<GroupChat[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchTabs = async () => {
    try {
      // Placeholder data - replace with actual API call
      const mockTabs = [
        { id: 'poap', name: 'POAP', chainId: '1', description: 'Connect with other participants and organizers to share your memories.' },
        { id: 'ethglobalBankok', name: 'ethglobalBankok', chainId: '1', description: 'ethglobalBankok' },
      ];
      setTabs(mockTabs);
      setActiveTab(mockTabs[0].id);
    } catch (error) {
      console.error('Error fetching tabs:', error);
    }
  };

  const getContractInstance = (): ethers.Contract | null => {
    try {
      const provider = new ethers.JsonRpcProvider('https://rpc.gnosis.gateway.fm');
      return new ethers.Contract(CONTRACT_ADDRESSES.poap, CONTRACT_ABIS.poap, provider);
    } catch (error) {
      console.error('Failed to initialize contract instance:', error);
      return null;
    }
  };

  const fetchTotalSupply = async (): Promise<ContractResponse> => {
    try {
      const contract = getContractInstance();
      if (!contract) {
        throw new Error('Contract instance not initialized');
      }

      const totalSupply = await contract.totalSupply();
      console.log('totalSupply1212',totalSupply)
      return {
        success: true,
        data: formatNumber(totalSupply.toString())
      };
    } catch (error) {
      console.error('Error fetching total supply:', error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown error occurred')
      };
    }
  };

  const fetchGroupChats = async (tabId: string) => {
    setLoading(true);
    try {
      const totalSupplyResponse = await fetchTotalSupply();
      console.log('totalSupplyResponse121',totalSupplyResponse)
      const membersCount = totalSupplyResponse.success ? totalSupplyResponse.data : '0';

      const mockData = [
        {
          id: '1',
          imageUrl: 'https://poap.zendesk.com/hc/theming_assets/01HZHAFBV2ZVH4TYE1F7J8SY0C',
          title: 'POAP Groups',
          description: 'Welcome, Collector! Connect with new friends or reconnect with familiar faces from past events. Enjoy the community!',
          activeOnChain: '1.2k',
          members: membersCount ?? '0'
        },
      ];
      setGroupChats(mockData);
    } catch (error) {
      console.error('Error fetching group chat data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTabs();
  }, []);

  useEffect(() => {
    if (activeTab) {
      fetchGroupChats(activeTab);
    }
  }, [activeTab]);

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      <div className="flex border-b border-gray-200 dark:border-gray-700 px-6 bg-white dark:bg-gray-800 sticky top-0 z-10">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={classNames(
              'px-6 py-4 text-sm font-medium transition-colors relative',
              activeTab === tab.id
                ? 'text-accent-600 dark:text-accent-500'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            )}
          >
            {tab.name}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-accent-600 dark:bg-accent-500"></div>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-6">
        {tabs.find((tab) => tab.id === activeTab) && (
          <div className="mb-8 bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
            <h1 className="text-4xl font-black dark:text-white">
              {tabs.find((tab) => tab.id === activeTab)?.name}
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2 text-lg font-normal">
              {tabs.find((tab) => tab.id === activeTab)?.description}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold dark:text-white">Popular Group Chats</h2>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-10 w-10 border-3 border-accent-600 border-t-transparent"></div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-6">
            {groupChats.map((groupChat) => (
              <GroupChatCard key={groupChat.id} {...groupChat} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Discover; 