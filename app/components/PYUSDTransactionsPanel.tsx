"use client";
import React, { useEffect, useState } from 'react';
import { TransactionData } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { enUS } from 'date-fns/locale';
import Tooltip, { TooltipProps, tooltipClasses } from '@mui/material/Tooltip';
import { styled } from '@mui/material/styles';

import { getPyUSDData } from '../services/blockchain';
import PYUSDDetail from './PYUSDDetail';
import { CryptoData } from '../types';

interface PYUSDTransactionsPanelProps {
    transactions: TransactionData[];
    totalSupply: string;
};

const NoMaxWidthTooltip = styled(({ className, ...props }: TooltipProps) => (
    <Tooltip {...props} classes={{ popper: className }} />
))({
    [`& .${tooltipClasses.tooltip}`]: {
        maxWidth: 'none',
        fontSize: '12px',
    },
});

export default function PYUSDTransactionsPanel({ transactions, totalSupply }: PYUSDTransactionsPanelProps) {
    const [viewMode, setViewMode] = useState<'list' | 'insights'>('insights');
    const [PYUSDdata, setPYUSDdata] = useState<CryptoData | null>(null);

    useEffect(() => {
        const fetchPYUSDData = async () => {
            const data = await getPyUSDData();
            setPYUSDdata(data);
        };

        fetchPYUSDData();
    }, []);
    
    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-[#0c3c6f] text-white px-6 py-4">
                <h2 className="text-xl font-semibold">PYUSD Transaction Flow</h2>
            </div>

            <div className="border-b border-gray-200">
                <nav className="flex -mb-px">
                    <button
                        onClick={() => setViewMode('insights')}
                        className={`py-4 px-6 cursor-pointer text-center border-b-2 text-sm font-semibold text-gray-700 ${
                        viewMode === 'insights'
                            ? 'border-[#0c3c6f] text-[#0c3c6f]'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        Statistics & Insights
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`py-4 px-6 cursor-pointer text-center border-b-2 text-sm font-semibold text-gray-700 ${
                        viewMode === 'list'
                            ? 'border-[#0c3c6f] text-[#0c3c6f]'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        Transaction List
                    </button>
                </nav>
            </div>
            
            <div className="px-6 py-4">
            {viewMode === 'list' ? (
                <>
                <div className="mb-4">
                    <p className="text-sm text-gray-600">
                        Showing {transactions.length} of the latest PYUSD transactions
                    </p>
                </div>
                
                {transactions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        There are no recent PYUSD transactions
                    </div>
                ) : (
                    <div className="overflow-x-auto max-h-[1400px]">
                        <table className="min-w-full divide-y divide-gray-200 relative">
                            <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                    <th scope="col" className="px-3 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                                        Hash
                                    </th>
                                    <th scope="col" className="px-3 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                                        From
                                    </th>
                                    <th scope="col" className="px-3 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                                        To
                                    </th>
                                    <th scope="col" className="px-3 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                                        Value (PYUSD)
                                    </th>
                                    <th scope="col" className="px-3 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                                        Time
                                    </th>
                                    <th scope="col" className="px-3 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                                        Status
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {transactions.map((tx, index) => (
                                    <tr key={index + 1} className="hover:bg-gray-50">
                                        <NoMaxWidthTooltip title={tx.hash} placement="top">
                                        <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                                            <a 
                                                href={`/tx/${tx.hash}`} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-blue-500 hover:text-blue-700"
                                            >
                                                {tx.hash.substring(0, 10)}...
                                            </a>
                                        </td>
                                        </NoMaxWidthTooltip>
                                        <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                                            {tx.from === '0x0000000000000000000000000000000000000000' 
                                                ? 'Mint (0x000...)' 
                                                : `${tx.from.substring(0, 6)}...${tx.from.slice(-4)}`}
                                        </td>
                                        <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                                            {tx.to === '0x0000000000000000000000000000000000000000' 
                                                ? 'Burn (0x000...)' 
                                                : `${tx.to.substring(0, 6)}...${tx.to.slice(-4)}`}
                                        </td>
                                        <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                                            {(parseInt(tx.value) / 1e6).toLocaleString("en-US", { 
                                                minimumFractionDigits: 0,
                                                maximumFractionDigits: 2
                                            })}
                                        </td>
                                        <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                                            {formatDistanceToNow(new Date(tx.timestamp * 1000), { 
                                                addSuffix: true,
                                                locale: enUS
                                            })}
                                        </td>
                                        <td className="px-3 py-3 whitespace-nowrap text-sm">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                tx.status ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                            }`}>
                                                {tx.status ? 'Success' : 'Failed'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                </>
            ) : (
                <PYUSDDetail data={PYUSDdata} totalSupply={totalSupply} />
            )}
            </div>
        </div>
    );
};
