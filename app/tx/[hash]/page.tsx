"use client";
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Head from 'next/head';
import { getTransactionFlow } from '../../services/blockchain';
import { TransactionFlow } from '../../types';
import TransactionFlowVisualization from '../../components/TransactionFlowVisualization';
import TransactionDetails from '../../components/TransactionDetails';
import TransactionAssistant from '../../components/TransactionAssistant';

export default function TransactionPage() {
    const router = useRouter();
    const params = useParams();
    const hash = params.hash as string;
    const [txHash, setTxHash] = useState('');
    const [txFlow, setTxFlow] = useState<TransactionFlow | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (txHash) {
            router.push(`/tx/${txHash}`);
        }
    };
    
    useEffect(() => {
        if (!hash || typeof hash !== 'string') return;
        
        async function fetchData() {
            try {
                setLoading(true);
                const flow = await getTransactionFlow(hash as string);
                setTxFlow(flow);
                setError(null);
            } catch (err) {
                setError('Failed to load transaction data or Transaction Hash not found.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        
        fetchData();
    }, [hash]);
    
    return (
        <div className="min-h-screen bg-gray-100 text-black">
            <Head>
                <title>Transaction {hash ? `${hash.slice(0, 6)}...` : 'Details'} | Transaction Flow Explorer</title>
            </Head>
            
            <main className="container mx-auto px-4 py-8">
                <div className="flex flex-grid mb-4 gap-4 place-content-between">
                    <button
                        onClick={() => router.push('/')}
                        className="flex items-center text-blue-600 hover:text-blue-800 cursor-pointer"
                    >
                        <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Home
                    </button>

                    <form onSubmit={handleSubmit} className='flex flex-grid place-content-center'>
                        <div className="min-w-4xl bg-white">
                            <input
                                type="text"
                                id="txHash"
                                value={txHash}
                                onChange={(e) => setTxHash(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="0x..."
                            />
                        </div>
                        <button
                            type="submit"
                            className="self-center max-h-12 bg-[#0c3c6f] text-white py-1 px-2 ml-2 rounded-lg hover:bg-[#56b9d5] transition-colors cursor-pointer"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="30" height="30" viewBox="0 0 64 64" className='fill-white'>
                            <path d="M 27 9 C 17.075 9 9 17.075 9 27 C 9 36.925 17.075 45 27 45 C 31.129213 45 34.9263 43.587367 37.966797 41.240234 L 51.048828 54.322266 C 51.952828 55.226266 53.418266 55.226266 54.322266 54.322266 C 55.226266 53.418266 55.226266 51.952828 54.322266 51.048828 L 41.240234 37.966797 C 43.587367 34.9263 45 31.129213 45 27 C 45 17.075 36.925 9 27 9 z M 27 13 C 34.719 13 41 19.281 41 27 C 41 34.719 34.719 41 27 41 C 19.281 41 13 34.719 13 27 C 13 19.281 19.281 13 27 13 z"></path>
                            </svg>
                        </button>
                    </form>
                </div>
                
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                ) : error ? (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                        {error}
                    </div>
                ) : txFlow ? (
                <div className="space-y-6">
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h1 className="text-2xl font-bold mb-4">Transaction Flow</h1>
                        <div className="border-t border-gray-200 pt-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-500">Transaction Hash</p>
                                <p className="font-mono break-all">{txFlow.hash}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Block Number</p>
                                <p>{txFlow.blockNumber}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Timestamp</p>
                                <p>{new Date(txFlow.timestamp * 1000).toLocaleString('en-Us', { timeZone: "UTC", weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" })} UTC</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Total Value</p>
                                <p>{txFlow.totalValue} ETH</p>
                            </div>
                            </div>
                        </div>
                    </div>
                    
                    <TransactionAssistant txHash={txFlow.hash} />
                    <TransactionFlowVisualization flow={txFlow} />
                    <TransactionDetails flow={txFlow} />
                </div>
                ) : (
                <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
                    No transaction data found
                </div>
                )}
            </main>
        </div>
    );
};
