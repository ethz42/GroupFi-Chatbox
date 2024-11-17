import { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react'; // Import usePrivy hook
const { connectWallet, createSmartContractWallet, transferTokens, getBalance, getTransactionHistory } = usePrivy();
const {setBalance, setTransactionHistory} = usePrivy();
const [walletAddress, setWalletAddress] = useState<string | null>(null);
let spendLimit: number = 0;
let spentAmount: number = 0;
export const handleCreateWallet = async () => {
    try {
        const wallet = await createSmartContractWallet();
        if (wallet) {
            setWalletAddress(wallet.address); 
            console.log('Smart Contract Wallet created:', wallet);
        } else {
            console.error('Failed to create Smart Contract Wallet');
        }
    } catch (error) {
        console.error('Error creating Smart Contract Wallet:', error);
    }
};
export const setSpendLimit = (limit: number) => {
    spendLimit = limit; // Set the spend limit
    console.log('Spend limit set to:', spendLimit);
};
// Function to fetch the current spend limit
export const fetchSpendLimit = () => {
    console.log('Current Spend Limit:', spendLimit);
    return spendLimit; // Return the current spend limit
};
export const handleTransferTokensWithLimit = async (recipient: string, amount: number) => {
    if (spentAmount + amount > spendLimit) {
        console.error('Transfer amount exceeds spend limit');
        return; // Prevent transfer if it exceeds the limit
    }
    try {
        const result = await transferTokens(walletAddress, recipient, amount);
        spentAmount += amount; // Update the spent amount
        console.log('Transfer result:', result);
        if (walletAddress) {
            await fetchTransactionHistory(walletAddress);
            await fetchBalance(walletAddress);
        }
    } catch (error) {
        console.error('Error transferring tokens:', error);
    }
};
export const fetchBalance = async (walletAddress: string) => {
    try {
        const balance = await getBalance(walletAddress);
        setBalance(balance);
        console.log('Wallet Balance:', balance);
    } catch (error) {
        console.error('Error fetching balance:', error);
    }
};
export const fetchTransactionHistory = async (walletAddress: string) => {
    try {
        const history = await getTransactionHistory(walletAddress);
        setTransactionHistory(history);
        console.log('Transaction History:', history);
    } catch (error) {
        console.error('Error fetching transaction history:', error);
    }
};