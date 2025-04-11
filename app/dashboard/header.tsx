import React from 'react';

interface HeaderProps {
    refreshInterval: number;
    onRefreshIntervalChange: (seconds: number) => void;
    latestBlock?: number;
};

export default function Header({ refreshInterval, onRefreshIntervalChange, latestBlock }: HeaderProps) {
    
    return (
        <header className="py-4 mb-6 text-black">
            <div className="flex flex-col md:flex-row justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">
                        PYUSD Network Congestion and Flow Dashboard
                    </h1>
                    <p className="text-sm text-gray-600">
                        {latestBlock && ` • Newest Block: #${latestBlock}`}
                    </p>
                </div>
                
                <div className="mt-4 md:mt-0 flex items-center">
                    <span className="mr-2 text-sm">Refresh every:</span>
                    <select 
                        value={refreshInterval}
                        onChange={(e) => onRefreshIntervalChange(Number(e.target.value))}
                        className="border rounded py-1 px-2 text-sm cursor-pointer"
                    >
                        <option value="30">30 second</option>
                        <option value="60">1 minute</option>
                        <option value="300">5 minutes</option>
                    </select>
                    
                    <button 
                        onClick={() => window.location.reload()}
                        className="cursor-pointer ml-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-4 rounded text-sm"
                    >
                        Refresh Now
                    </button>
                </div>
            </div>
        </header>
    );
};