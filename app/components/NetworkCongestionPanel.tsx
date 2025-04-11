/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { ethers } from 'ethers';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';
import { NetworkStatus, PyusdTransactionStats } from '../types';
import { getPyusdTransactionStats } from '../services/blockchain';
import PYUSDTransactionChart from './PYUSDTransactionChart';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

interface NetworkCongestionPanelProps {
    networkStatus: NetworkStatus | null;
};

export default function NetworkCongestionPanel({ networkStatus }: NetworkCongestionPanelProps) {
    const [pyusdTransactions, setPyusdTransactions] = useState<PyusdTransactionStats | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                if (networkStatus?.blockNumber) {
                    const count = await getPyusdTransactionStats(networkStatus.blockNumber);
                    setPyusdTransactions(count);
                }
            } catch (err) {
                console.error(err);
            }
        };

        fetchData();
    }, [networkStatus]);

    if (!networkStatus) return null;
    
    const { 
        blockNumber, 
        gasPrice, 
        feeHistory,
        pendingTxCount,
        queuedTxCount,
        estimatedGas
    } = networkStatus;
    
    // Prepare data for gas price history chart
    const gasHistoryLabels = feeHistory.map((fee: any) => `${fee.oldestBlock}`);
    const baseFeeData = feeHistory.map((fee: any) => ethers.formatUnits(fee.baseFeePerGas, 'gwei'));
    
    const gasHistoryData = {
        labels: gasHistoryLabels,
        datasets: [
            {
                label: 'Base Fee (Gwei)',
                data: baseFeeData,
                borderColor: 'rgb(53, 162, 235)',
                backgroundColor: 'rgba(53, 162, 235, 0.5)',
            }
        ],
    };
    
    const totalPendingTx = pendingTxCount + queuedTxCount;
    const congestionLevel = 
        totalPendingTx > 10000 ? 'High' : 
        totalPendingTx > 5000 ? 'Mid' : 'Low';
    
    const congestionColor = 
        congestionLevel === 'High' ? 'text-red-500' :
        congestionLevel === 'Mid' ? 'text-yellow-500' : 'text-green-500';

    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden h-full">
            <div className="bg-[#0c3c6f] text-white px-6 py-4">
                <h2 className="text-xl font-semibold">Network Congestion Status</h2>
            </div>
            
            <div className="px-6 py-4">
                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="text-sm text-gray-500 uppercase">Latest Blocks</h3>
                        <p className="text-2xl font-bold">{blockNumber}</p>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="text-sm text-gray-500 uppercase">Current Gas Price</h3>
                        <p className="text-2xl font-bold">{(gasPrice / 1e9).toFixed(2)} Gwei</p>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="text-sm text-gray-500 uppercase">Pending Transactions</h3>
                        <p className="text-2xl font-bold">{pendingTxCount.toLocaleString()}</p>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="text-sm text-gray-500 uppercase">Queue Transaction</h3>
                        <p className="text-2xl font-bold">{queuedTxCount.toLocaleString()}</p>
                    </div>
                </div>
                    
                <div className="bg-gray-50 p-4 rounded-lg mb-8">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-sm text-gray-500 uppercase">Congestion Level</h3>
                        <p className={`font-bold ${congestionColor}`}>{congestionLevel}</p>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                            className={`h-2.5 rounded-full ${
                                congestionLevel === 'High' ? 'bg-red-500' : 
                                congestionLevel === 'Mid' ? 'bg-yellow-500' : 'bg-green-500'
                            }`} 
                            style={{ 
                                width: `${Math.min(100, (totalPendingTx / 15000) * 100)}%` 
                            }}
                        ></div>
                    </div>
                </div>

                {pyusdTransactions && (
                    <div className="flex-col bg-gray-50 p-4 rounded-lg col-span-2 mb-8">
                        <div className='bg-white p-6 rounded-xl shadow-md mb-4'>
                            <h3 className="text-sm text-gray-500 uppercase">Transactions Involving PYUSD In The Last 10 Blocks</h3>
                            <p className="text-2xl font-bold">{pyusdTransactions.totalTransactions.toLocaleString()}</p>
                        </div>

                        <PYUSDTransactionChart data={pyusdTransactions.transactionCounts} />
                    </div>
                )}
                
                <div className="mb-8">
                    <h3 className="text-sm text-gray-500 uppercase mb-2">Gas Cost Estimate</h3>
                    <div className="flex justify-between text-sm mb-1">
                        <span>Low</span>
                        <span>Average</span>
                        <span>High</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <div className="bg-gray-50 p-2 rounded-lg text-center">
                            <p className="text-lg font-bold">{(estimatedGas.low / 1e9).toFixed(2)} Gwei</p>
                        </div>
                        <div className="bg-gray-50 p-2 rounded-lg text-center">
                            <p className="text-lg font-bold">{(estimatedGas.average / 1e9).toFixed(2)} Gwei</p>
                        </div>
                        <div className="bg-gray-50 p-2 rounded-lg text-center">
                            <p className="text-lg font-bold">{(estimatedGas.fast / 1e9).toFixed(2)} Gwei</p>
                        </div>
                    </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                    <h3 className="text-sm text-gray-500 uppercase mb-2">Tren Base Fee (Last 10 Blocks)</h3>
                    <div className="bg-white p-6 rounded-xl shadow-md" style={{ height: '300px' }}>
                        <Line 
                            data={gasHistoryData} 
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                scales: {
                                    y: {
                                        beginAtZero: false,
                                        title: {
                                            display: true,
                                            text: 'Gwei'
                                        }
                                    },
                                    x: {
                                        title: {
                                            display: true,
                                            text: 'Blok'
                                        }
                                    },
                                },
                                plugins: {
                                    legend: {
                                        position: 'top' as const,
                                    },
                                    tooltip: {
                                        callbacks: {
                                            label: function(context) {
                                                return `${context.dataset.label}: ${context.parsed.y.toFixed(2)} Gwei`;
                                            }
                                        }
                                    }
                                },
                            }} 
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
