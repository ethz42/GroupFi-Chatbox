import React from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useAccount, useDisconnect } from 'wagmi';

const PrivyLoginButton = ({
    disableLogin,
    handleLogin,
    address
}: {
    disableLogin: boolean;
    handleLogin: () => void;
    address: string | null;
}) => {
    const [showDropdown, setShowDropdown] = React.useState(false);
    const { disconnect } = useDisconnect();

    const formatAddress = (addr: string) => {
        if (!addr) return '';
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    return (
        <>
            {address ? (
                <div className="relative">
                    <button
                        onClick={() => setShowDropdown(!showDropdown)}
                        className="px-4 py-2 rounded transition-colors bg-gray-100 text-gray-800 hover:bg-gray-200 z-50"
                    >
                        {formatAddress(address)}
                    </button>

                    {showDropdown && (
                        <div className="absolute right-0 mt-2 w-48 py-2 bg-white rounded-lg shadow-xl border border-gray-100 z-50">
                            <button
                                onClick={disconnect}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                            >
                                Disconnect
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <button
                    disabled={disableLogin}
                    onClick={handleLogin}
                    className="px-4 py-2 rounded transition-colors bg-gray-100 text-gray-800 hover:bg-gray-200"
                >
                    Connect Wallet
                </button>
            )}
        </>
    );
};

export default PrivyLoginButton;