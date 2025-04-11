import { useState, useEffect } from 'react';
import { PoolData, PoolType } from '../types';
import { fetchUniswapPools, fetchCurvePools } from '../services/poolService';
import PoolList from './PoolList';
import PoolDetails from './PoolDetails';

export default function PoolAnalyzer() {
    const [pools, setPools] = useState<PoolData[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedPool, setSelectedPool] = useState<PoolData | null>(null);
    const [activeTab, setActiveTab] = useState<PoolType>('uniswap');

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                let poolData: PoolData[] = [];
                
                if (activeTab === 'uniswap') {
                    poolData = await fetchUniswapPools();
                } else {
                    poolData = await fetchCurvePools();
                }
                
                setPools(poolData);
                setError(null);
            } catch (err) {
                console.error('Error fetching pool data:', err);
                setError('Failed to fetch pool data. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();

        // Refresh every 5 minutes
        const intervalId = setInterval(fetchData, 300000);

        return () => clearInterval(intervalId);
    }, [activeTab]);

    const handlePoolSelect = (pool: PoolData) => {
        setSelectedPool(pool);
    };

    const handleTabChange = (tab: PoolType) => {
        setActiveTab(tab);
        setSelectedPool(null);
        setPools([]);
    };

    return (
        <div className="flex flex-col p-8">
            <h1 className="text-3xl font-bold mb-8">PYUSD Pool Analyzer</h1>
            
            <div className="flex mb-6">
                <button
                    className={`px-4 py-2 mr-2 rounded-lg cursor-pointer ${activeTab === 'uniswap' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                    onClick={() => handleTabChange('uniswap')}
                >
                    Uniswap V3 Pools
                </button>
                <button
                    className={`px-4 py-2 rounded-lg cursor-pointer ${activeTab === 'curve' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                    onClick={() => handleTabChange('curve')}
                >
                    Curve Finance Pools
                </button>
            </div>

            <div className='mt-1 mb-4 text-sm text-gray-500'>• Data Refresh Every 5 minutes</div>

            {loading && pools.length === 0 ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
            ) : error ? (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    {error}
                </div>
            ) : (
                <div className="flex flex-col md:flex-row gap-8">
                    <div className="w-full md:w-1/2">
                        <PoolList 
                            pools={pools} 
                            onSelectPool={handlePoolSelect}
                            selectedPoolId={selectedPool?.id}
                            poolType={activeTab}
                        />
                    </div>
                    <div className="w-full md:w-1/2">
                        {selectedPool ? (
                            <PoolDetails pool={selectedPool} />
                        ) : (
                            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                                <p className="text-gray-500">Select a pool to view details</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};