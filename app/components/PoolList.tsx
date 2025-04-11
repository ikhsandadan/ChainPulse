import { useState } from 'react';
import { PoolData, PoolType } from '../types';
import Tooltip, { TooltipProps, tooltipClasses } from '@mui/material/Tooltip';
import { styled } from '@mui/material/styles';

interface PoolListProps {
    pools: PoolData[];
    onSelectPool: (pool: PoolData) => void;
    selectedPoolId: string | undefined;
    poolType: PoolType;
};

const NoMaxWidthTooltip = styled(({ className, ...props }: TooltipProps) => (
    <Tooltip {...props} classes={{ popper: className }} />
))({
    [`& .${tooltipClasses.tooltip}`]: {
        maxWidth: 'none',
        fontSize: '12px',
    },
});

export default function PoolList({ pools, onSelectPool, selectedPoolId, poolType }: PoolListProps) {
    const [sortBy, setSortBy] = useState<'tvl' | 'volume' | 'apy'>('tvl');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    
    const sortedPools = [...pools].sort((a, b) => {
        let valueA: number, valueB: number;
        
        switch (sortBy) {
            case 'tvl':
                valueA = a.tvl;
                valueB = b.tvl;
                break;
            case 'volume':
                valueA = a.volume24h;
                valueB = b.volume24h;
                break;
            case 'apy':
                valueA = a.apy;
                valueB = b.apy;
                break;
        }
        
        return sortOrder === 'asc' ? valueA - valueB : valueB - valueA;
    });
    
    const handleSort = (column: 'tvl' | 'volume' | 'apy') => {
        if (sortBy === column) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortOrder('desc');
        }
    };

    return (
        <div className="bg-white rounded-lg shadow overflow-hidden h-full">
            <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg font-medium leading-6 text-gray-900">
                    {poolType === 'uniswap' ? 'Uniswap' : 'Curve Finance'} PYUSD Pools
                </h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                    {sortedPools.length} pools found
                </p>
            </div>
            
            <div className="border-t border-gray-200">
                <div className="grid grid-cols-4 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-500">
                    <div className="col-span-1 text-sm font-semibold text-gray-700">Pool</div>
                    <NoMaxWidthTooltip title="Total Value Locked" placement='top-start'>
                    <div className="col-span-1 cursor-pointer text-sm font-semibold text-gray-700" onClick={() => handleSort('tvl')}>
                        TVL {sortBy === 'tvl' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </div>
                    </NoMaxWidthTooltip>
                    <div className="col-span-1 cursor-pointer text-sm font-semibold text-gray-700" onClick={() => handleSort('volume')}>
                        Volume {sortBy === 'volume' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </div>
                    <NoMaxWidthTooltip title={poolType === 'uniswap' ? 'Annual Percentage Rate' : 'Annual Percentage Yield'} placement='top-start'>
                    <div className="col-span-1 cursor-pointer text-sm font-semibold text-gray-700" onClick={() => handleSort('apy')}>
                        {poolType === 'uniswap' ? 'APR' : 'APY'} {sortBy === 'apy' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </div>
                    </NoMaxWidthTooltip>
                </div>
                
                <div className="overflow-auto">
                    {sortedPools.length === 0 ? (
                        <div className="px-4 py-5 text-center text-gray-500">
                            No pools found
                        </div>
                    ) : (
                        sortedPools.map((pool, i) => (
                            <div
                                key={i}
                                className={`grid grid-cols-4 px-4 py-3 text-sm border-t border-gray-200 hover:bg-gray-50 cursor-pointer ${
                                    pool.id === selectedPoolId ? 'bg-blue-50' : ''
                                }`}
                                onClick={() => onSelectPool(pool)}
                            >
                                <div className={`flex gap-2 col-span-1 font-medium truncate ${pool?.type === 'uniswap' ? '' : 'mr-4'}`}>
                                    <div>{pool?.name}</div>
                                    <div className={`inline-flex self-center place-self-center items-center px-1 py-0.5 rounded-full text-xs font-medium text-gray-500 ${pool?.type === 'uniswap' ? 'border border-gray-500' : 'mr-4'}`}>{pool?.type === 'uniswap' ? `${(pool?.fee ?? 0) / 10000}%` : null}</div>
                                </div>
                                <div className="col-span-1">${pool.tvl.toLocaleString('en-US')}</div>
                                <div className="col-span-1">${pool.volume24h.toLocaleString('en-US')}</div>
                                <div className="col-span-1">{pool.apy.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 3})}%</div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};