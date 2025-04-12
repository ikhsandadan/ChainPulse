"use client"
import React, { useState, useEffect } from 'react';
import NetworkCongestionPanel from '../components/NetworkCongestionPanel';
import PYUSDTransactionsPanel from '../components/PYUSDTransactionsPanel';
import Header from './header';
import Layout from './layout';
import { fetchBlockchainData, getTotalSupply } from '../services/blockchain';
import { NetworkStatus, TransactionData } from '../types';
import TransactionAssistant from '../components/TransactionAssistant';

export default function Dashboard() {
    const [networkStatus, setNetworkStatus] = useState<NetworkStatus | null>(null);
    const [pyusdTransactions, setPyusdTransactions] = useState<TransactionData[]>([]);
    const [totalSupply, setTotalSupply] = useState<string>('0');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshInterval, setRefreshInterval] = useState(300);

    const formatNumberString = (numStr: string): string => {
        const [integerPart, decimalPart] = numStr.split('.');
        const formattedIntegerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        return decimalPart ? `${formattedIntegerPart}.${decimalPart}` : formattedIntegerPart;
    };
    
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const data = await fetchBlockchainData(100);
                const supply = await getTotalSupply();
                
                setPyusdTransactions(data.pyusdTransactions.reverse());
                setNetworkStatus(data.networkStatus);
                setTotalSupply(formatNumberString(supply));
                setError(null);
            } catch (err) {
                console.error('Error fetching blockchain data:', err);
                setError('Failed to load blockchain data. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        
        // Set up refresh interval
        const intervalId = setInterval(fetchData, refreshInterval * 1000);
        
        return () => clearInterval(intervalId);
    }, [refreshInterval]);
    
    const handleRefreshIntervalChange = (seconds: number) => {
        setRefreshInterval(seconds);
    };
    
    return (
        <Layout>
        <Header 
            refreshInterval={refreshInterval} 
            onRefreshIntervalChange={handleRefreshIntervalChange}
            latestBlock={networkStatus?.blockNumber}
        />
        
        {loading && !networkStatus ? (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p>Loading blockchain data...</p>
                </div>
            </div>
        ) : error ? (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 my-4">
                <p>{error}</p>
                <button 
                    onClick={() => fetchBlockchainData(50)} 
                    className="my-4 bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-4 rounded"
                >
                    Try again
                </button>
            </div>
        ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 items-stretch">
                <div className="col-span-1">
                    <div className="h-full">
                        <NetworkCongestionPanel networkStatus={networkStatus} />
                    </div>
                </div>
                <div className="col-span-2">
                    <div className="h-full">
                        <PYUSDTransactionsPanel transactions={pyusdTransactions} totalSupply={totalSupply} />
                    </div>
                </div>
            </div>
        )}
        <TransactionAssistant txHash={'(REPLACE WITH TRANSACTION HASH)'} />
        </Layout>
    );
};
