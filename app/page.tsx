"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Head from 'next/head';

import Dashboard from './dashboard/page';
import PoolAnalyzer from './components/PoolAnalyzer';

export default function Homepage() {
    const [txHash, setTxHash] = useState('');
    const router = useRouter();
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (txHash) {
            router.push(`/tx/${txHash}`);
        }
    };
    
    return (
        <div className="min-h-screen bg-gray-100 text-black antialiased">
            <Head>
                <title>ChainPulse</title>
                <meta name="description" content="A powerful blockchain explorer that provides comprehensive visibility" />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            
            <main className="container mx-auto px-4 pb-16 pt-2 max-w-full antialiased">
                <img src="/logo.png" alt="ChainPulse Logo" className="mx-auto mb-2 h-56 w-auto" />
                
                <div className="flex mx-8 bg-white rounded-lg shadow-md p-6 mb-7 place-content-center">
                    <form onSubmit={handleSubmit} className='flex flex-grid place-content-center'>
                        <div className="mb-4 min-w-6xl">
                            <label htmlFor="txHash" className="block text-sm font-medium text-gray-700 mb-2">
                                Enter Transaction Hash
                            </label>
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
                            className="self-center max-h-12 bg-blue-600 text-white py-1 px-2 mt-3 ml-2 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="30" height="30" viewBox="0 0 64 64" className='fill-white'>
                            <path d="M 27 9 C 17.075 9 9 17.075 9 27 C 9 36.925 17.075 45 27 45 C 31.129213 45 34.9263 43.587367 37.966797 41.240234 L 51.048828 54.322266 C 51.952828 55.226266 53.418266 55.226266 54.322266 54.322266 C 55.226266 53.418266 55.226266 51.952828 54.322266 51.048828 L 41.240234 37.966797 C 43.587367 34.9263 45 31.129213 45 27 C 45 17.075 36.925 9 27 9 z M 27 13 C 34.719 13 41 19.281 41 27 C 41 34.719 34.719 41 27 41 C 19.281 41 13 34.719 13 27 C 13 19.281 19.281 13 27 13 z"></path>
                            </svg>
                        </button>
                    </form>
                </div>
                
                <Dashboard />
                <PoolAnalyzer />
            </main>
        </div>
    );
};