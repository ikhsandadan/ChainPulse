import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { enUS } from 'date-fns/locale';
import Tooltip, { TooltipProps, tooltipClasses } from '@mui/material/Tooltip';
import { styled } from '@mui/material/styles';
import { FiCopy } from 'react-icons/fi';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, Legend } from "recharts";
import { PoolData, UniswapPoolData, CurvePoolData } from '../types';

interface PoolDetailsProps {
    pool: PoolData;
};

const NoMaxWidthTooltip = styled(({ className, ...props }: TooltipProps) => (
    <Tooltip {...props} classes={{ popper: className }} />
))({
    [`& .${tooltipClasses.tooltip}`]: {
        maxWidth: 'none',
        fontSize: '12px',
    },
});

export default function PoolDetails({ pool }: PoolDetailsProps) {
    const [activeTab, setActiveTab] = useState<'overview' | 'composition' | 'history'>('overview');
    const [valueCopied, setValueCopied] = useState('Copy Address');

    const formatYAxisValue = (value: number) => {
        if (value >= 1e6) {
            return `$${(value / 1e6).toFixed(1)}M`;
        } else if (value >= 1e3) {
            return `$${(value / 1e3).toFixed(0)}K`;
        } else {
            return `$${value}`;
        }
    };

    const handleCopy = (address: string) => {
        navigator.clipboard.writeText(address);
        setValueCopied('Copied!');
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            setValueCopied('Copy Address');
        }, 1000);
        return () => clearTimeout(timer);
    }, [valueCopied]);

    return (
        <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg font-medium leading-6 text-gray-900">
                    {pool.name} Pool Details
                </h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                    {pool.type === 'uniswap' ? 'Uniswap V3' : 'Curve Finance'} Pool
                </p>
            </div>
        
            <div className="border-t border-gray-200">
                <div className="px-4 py-3 bg-gray-50">
                    <div className="flex space-x-4">
                        <button
                            className={`px-3 py-2 text-sm font-semibold text-gray-700 rounded-md cursor-pointer ${
                                activeTab === 'overview' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'
                            }`}
                            onClick={() => setActiveTab('overview')}
                        >
                            Overview
                        </button>
                        <button
                                className={`px-3 py-2 text-sm font-semibold text-gray-700 rounded-md cursor-pointer ${
                                    activeTab === 'composition' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'
                                }`}
                                onClick={() => setActiveTab('composition')}
                        >
                            Composition
                        </button>
                        <button
                            className={`px-3 py-2 text-sm font-semibold text-gray-700 rounded-md cursor-pointer ${
                                activeTab === 'history' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'
                            }`}
                            onClick={() => setActiveTab('history')}
                        >
                            History
                        </button>
                    </div>
                </div>
            
                <div className="px-4 py-5">
                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <h4 className="text-sm font-medium text-gray-500">Pool Address</h4>
                                <div className='flex items-center gap-2'>
                                    <p className="mt-1 text-sm text-gray-900 break-all">{pool.address}</p>
                                    <Tooltip title={valueCopied} placement="top">
                                    <button
                                        onClick={() => handleCopy(pool.address)}
                                        className='cursor-pointer hover:text-blue-600 hover:scale-110'
                                    >
                                        <FiCopy size={14} />
                                    </button>
                                    </Tooltip>
                                </div>
                            </div>
                            <div>
                                <h4 className="text-sm font-medium text-gray-500">Created</h4>
                                <p className="mt-1 text-sm text-gray-900">
                                    {new Date(pool.createdAt * 1000).toLocaleDateString('en-US', {timeZone: 'UTC'})} UTC
                                </p>
                            </div>
                            <div>
                                <h4 className="text-sm font-medium text-gray-500">Total Value Locked</h4>
                                <p className="mt-1 text-sm text-gray-900">${pool.tvl.toLocaleString('en-US')}</p>
                            </div>
                            <div>
                                <h4 className="text-sm font-medium text-gray-500">24h Volume</h4>
                                <p className="mt-1 text-sm text-gray-900">${pool.volume24h.toLocaleString('en-US')}</p>
                            </div>
                            {pool.type === 'uniswap' ? (
                                <div className="flex flex-col space-y-1">
                                    <h4 className="text-sm font-medium text-gray-500">APR</h4>
                                    <p className="text-sm text-gray-900">
                                    {pool.apy.toLocaleString('en-US', {
                                        minimumFractionDigits: 0,
                                        maximumFractionDigits: 3,
                                    })}
                                    %
                                    </p>
                                </div>
                            ) : (
                                <div className="flex flex-col space-y-1">
                                    <h4 className="text-sm font-medium text-gray-500">APY</h4>
                                    <div className="ml-2 mr-40 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-gray-500">Daily:</span>
                                            <span className="text-sm text-gray-900">
                                            {pool.apy.toLocaleString('en-US', {
                                                minimumFractionDigits: 0,
                                                maximumFractionDigits: 3,
                                            })}
                                            %
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-gray-500">Weekly:</span>
                                            <span className="text-sm text-gray-900">
                                            {pool?.apyWeekly?.toLocaleString('en-US', {
                                                minimumFractionDigits: 0,
                                                maximumFractionDigits: 3,
                                            })}
                                            %
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div>
                                <h4 className="text-sm font-medium text-gray-500">24h Fees</h4>
                                <p className="mt-1 text-sm text-gray-900">${pool.fees24h.toLocaleString('en-US')}</p>
                            </div>
                            
                            {/* Uniswap specific fields */}
                            {pool.type === 'uniswap' && (
                                <>
                                <div>
                                    <h4 className="text-sm font-medium text-gray-500">Fee Tier</h4>
                                    <p className="mt-1 text-sm text-gray-900">
                                        {(pool as UniswapPoolData).fee / 10000}%
                                    </p>
                                </div>
                                <div>
                                    <h4 className="text-sm font-medium text-gray-500">Liquidity</h4>
                                    <p className="mt-1 text-sm text-gray-900">
                                        {(pool as UniswapPoolData).liquidity}
                                    </p>
                                </div>
                                </>
                            )}
                            
                            {/* Curve specific fields */}
                            {pool.type === 'curve' && (
                                <>
                                <div>
                                    <h4 className="text-sm font-medium text-gray-500">Virtual Price</h4>
                                    <p className="mt-1 text-sm text-gray-900">
                                        {(pool as CurvePoolData).virtualPrice.toLocaleString('en-US')}
                                    </p>
                                </div>
                                <div>
                                    <h4 className="text-sm font-medium text-gray-500">Amplification Coefficient</h4>
                                    <p className="mt-1 text-sm text-gray-900">
                                        {(pool as CurvePoolData).amplificationCoefficient}
                                    </p>
                                </div>
                                </>
                            )}
                        </div>
                    )}
            
                    {activeTab === 'composition' && (
                        <div>
                            <h4 className="text-sm font-medium text-gray-500 mb-4">Pool Composition</h4>
                            <div className="space-y-4">
                                {pool.tokens.map((token, index) => (
                                    <div key={token.address} className="flex justify-between items-center">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{token.symbol}</p>
                                            <div className='flex items-center gap-2'>
                                                <p className="text-xs text-gray-500">{token.address}</p>
                                                <Tooltip title={valueCopied} placement="top">
                                                <button
                                                    onClick={() => handleCopy(pool.address)}
                                                    className='cursor-pointer hover:text-blue-600 hover:scale-110 text-gray-500'
                                                >
                                                    <FiCopy size={12} />
                                                </button>
                                                </Tooltip>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-gray-900">
                                                {pool.reserves && pool.reserves[index] ? pool.reserves[index].toLocaleString('en-US') : '0'} {token.symbol}
                                            </p>
                                            {pool.tokens.length > 1 && pool.reserves && (
                                                <p className="text-xs text-gray-500">
                                                    {pool.reserves && pool.reserves[index] ? ((pool.reserves[index] / pool.reserves.reduce((a, b) => a + b, 0)) * 100).toFixed(2) : '0'}%
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                                
                            {pool.reserves && pool.reserves.length > 1 && (
                                <div className="mt-6">
                                    <h4 className="text-sm font-medium text-gray-500 mb-2">Token Distribution</h4>
                                    <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                                        {pool.tokens.map((token, index) => {
                                            const percentage = (pool.reserves![index] / pool.reserves!.reduce((a, b) => a + b, 0)) * 100;
                                            
                                            // Generate a different color for each token
                                            const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500', 'bg-red-500', 'bg-indigo-500'];
                                            
                                            return (
                                                <div
                                                    key={token.address}
                                                    className={`h-full ${colors[index % colors.length]} inline-block`}
                                                    style={{ width: `${percentage}%` }}
                                                ></div>
                                            );
                                        })}
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-4">
                                        {pool.tokens.map((token, index) => {
                                            const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500', 'bg-red-500', 'bg-indigo-500'];
                                            
                                            return (
                                                <div key={token.address} className="flex items-center">
                                                    <div className={`w-3 h-3 ${colors[index % colors.length]} rounded-full mr-2`}></div>
                                                    <span className="text-xs text-gray-700">{token.symbol}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                        
                    {activeTab === 'history' && (
                        <div>
                            {pool.type === 'uniswap' ? (
                                pool.dailyData7d && pool.dailyData7d.length > 0 ? (
                                    <>
                                    <h4 className="text-sm font-medium text-gray-500 mb-4">
                                        Volume History (Last {pool.dailyData7d.length} days)
                                    </h4>
                                    <div className="h-72 bg-gray-100 rounded p-4">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart
                                                data={pool.dailyData7d}
                                                margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis
                                                    dataKey="timestamp"
                                                    tickFormatter={(ts) => {
                                                        const date = new Date(ts * 1000);
                                                        return `${date.getMonth() + 1}/${date.getDate()}`;
                                                    }}
                                                />
                                                <YAxis tickFormatter={formatYAxisValue} />
                                                <RechartsTooltip
                                                    formatter={(value) =>
                                                        new Intl.NumberFormat('en-US', {
                                                        style: 'currency',
                                                        currency: 'USD',
                                                        }).format(value as number)
                                                    }
                                                    labelFormatter={(ts) => {
                                                        const date = new Date(ts * 1000);
                                                        return date.toLocaleDateString('en-US', {
                                                        hour: 'numeric',
                                                        minute: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric',
                                                        year: 'numeric',
                                                        });
                                                    }}
                                                />
                                                <Legend />
                                                <Bar dataKey="volumeUSD" name="Volume (USD)" fill="#00a63e" />
                                                <Bar dataKey="feesUSD" name="Fees (USD)" fill="#155dfc" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    </>
                                ) : (
                                    <p className="text-sm text-gray-500">No volume data available.</p>
                                )
                                ) : pool.type === 'curve' ? (
                                    <>
                                    <h4 className='text-sm font-medium text-gray-500 mb-2'>{pool?.curveLiquidity?.events?.length || 0} Recent Liquidity on {pool?.name}</ h4>
                                    <div className="text-sm font-medium mb-4 text-gray-500">
                                        Chain: {(pool?.curveLiquidity?.chain)?.toUpperCase()} | Address:{' '}
                                        {pool?.curveLiquidity?.address.slice(0, 6)}...
                                        {pool?.curveLiquidity?.address.slice(-4)}
                                    </div>
                                    <div className="overflow-x-auto max-h-96">
                                        <table className="min-w-full text-right text-sm divide-y divide-gray-200 relative">
                                            <thead className='bg-gray-100 sticky top-0'>
                                                <tr className="border-b border-gray-200">
                                                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Hash</th>
                                                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Action</th>
                                                    <th className='px-4 py-2 text-sm font-semibold text-gray-700'>Amount</th>
                                                    <th className='px-4 py-2 text-sm font-semibold text-gray-700'>Time</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {pool?.curveLiquidity?.events.map((event, index) => (
                                                    <tr key={index} className="border-b border-gray-200">
                                                        <td className="text-left px-4 py-2 text-sm text-gray-900">
                                                            <NoMaxWidthTooltip title={event.transactionHash} placement="top-start">
                                                            <a 
                                                                href={`/tx/${event.transactionHash}`} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer"
                                                                className="text-blue-500 hover:text-blue-700 truncate"
                                                            >
                                                                {event.transactionHash.substring(0, 10)}...
                                                            </a>
                                                            </NoMaxWidthTooltip>
                                                        </td>
                                                        <td
                                                            className={`text-left px-4 py-2 ${
                                                                event.eventType.includes('Remove')
                                                                ? 'text-red-500'
                                                                : 'text-green-500'
                                                            }`}
                                                        >
                                                            {event.eventType === 'RemoveLiquidityOne' ? 'Remove' : 'Add'}
                                                        </td>
                                                        <td className='px-4 py-2'>
                                                            {event?.tokensData?.length > 1 ? (
                                                                <>
                                                                {event.tokensData.map((token, idx) => (
                                                                    <div key={idx}>
                                                                    {token.amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} {token.tokenInfo.symbol}
                                                                    </div>
                                                                ))}
                                                                </>
                                                            ) : (
                                                                <div>
                                                                    {event?.tokensData[0]?.amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}{' '}
                                                                    {event?.tokensData[0]?.tokenInfo.symbol}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className='px-4 py-2 text-gray-500'>
                                                            {formatDistanceToNow(
                                                                new Date(`${event.time}Z`),
                                                                { addSuffix: true, locale: enUS }
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    </>
                                ) : null}
                            
                            {pool?.type === 'uniswap' ? (
                                <>
                                <h4 className="text-sm font-medium text-gray-500 mt-12 mb-4">{pool.transactions?.length || 0} Recent Transactions</h4>
                            
                                <div className="overflow-auto min-w-full max-h-96">
                                    <div className="relative">
                                        {/* Header */}
                                        <div className="grid grid-cols-6 bg-gray-50 px-4 py-2 text-xs font-medium text-gray-500 sticky top-0">
                                            <div className="col-span-1 text-sm font-semibold text-gray-700">Hash</div>
                                            <div className="col-span-1 ml-2 text-sm font-semibold text-gray-700">Type</div>
                                            <div className="col-span-1 text-sm font-semibold text-gray-700">USD</div>
                                            {pool?.transactions && pool.transactions.length > 0 && (
                                                <div className="col-span-1 text-sm font-semibold text-gray-700">{pool.transactions[0].token0Symbol}</div>
                                            )}
                                            {pool?.transactions && pool.transactions.length > 0 && (
                                                <div className="col-span-1 text-sm font-semibold text-gray-700">{pool.transactions[0].token1Symbol}</div>
                                            )}
                                            <div className="col-span-1 text-sm font-semibold text-gray-700">Time</div>
                                        </div>

                                        {/* Transaction data */}
                                        {pool?.transactions?.map((tx, i) => (
                                            <div key={i} className="grid grid-cols-6 px-4 py-3 text-sm border-t border-gray-200">
                                                <NoMaxWidthTooltip title={tx.id.split('#')[0]} placement="top-start">
                                                <a 
                                                    href={`/tx/${tx.id.split('#')[0]}`} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="text-blue-500 hover:text-blue-700 truncate"
                                                >
                                                    {tx.id.split('#')[0]}
                                                </a>
                                                </NoMaxWidthTooltip>
                                                <div
                                                    className={`col-span-1 ml-2 capitalize ${
                                                        tx.type === 'add' || tx.type === 'buy PYUSD'
                                                        ? 'text-green-500'
                                                        : 'text-red-500'
                                                    }`}
                                                >
                                                    {tx.type}
                                                </div>
                                                <div className="col-span-1">
                                                    ${parseFloat(tx.amountUSD).toLocaleString('en-US', {
                                                        minimumFractionDigits: 0,
                                                        maximumFractionDigits: 2,
                                                    })}
                                                </div>
                                                <div className="col-span-1">
                                                    {parseFloat(tx.amount0).toLocaleString('en-US', {
                                                        minimumFractionDigits: 0,
                                                        maximumFractionDigits: 2,
                                                    })}
                                                </div>
                                                <div className="col-span-1">
                                                    {parseFloat(tx.amount1).toLocaleString('en-US', {
                                                        minimumFractionDigits: 0,
                                                        maximumFractionDigits: 2,
                                                    })}
                                                </div>
                                                <div className="col-span-1 text-gray-500">
                                                    {formatDistanceToNow(new Date(tx.timestamp * 1000), {
                                                        addSuffix: true,
                                                        locale: enUS,
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                </>
                            ):(
                                <>
                                <h4 className='text-sm font-medium text-gray-500 mt-12 mb-4'>{pool?.curveSwaps?.length || 0} Recent Swaps on {pool?.name}</ h4>
                                <div className="max-h-96 overflow-auto mt-2">
                                    <table className="min-w-full bg-white divide-y divide-gray-200 relative">
                                        <thead className="bg-gray-100 sticky top-0">
                                            <tr>
                                                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">
                                                    Hash
                                                </th>
                                                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">
                                                    Swap
                                                </th>
                                                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">
                                                    Amount
                                                </th>
                                                <th className="px-4 py-2 text-right text-sm font-semibold text-gray-700">
                                                    Time
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                        {pool?.curveSwaps?.map((trade, i) => (
                                            <tr key={i} className="border-t border-gray-200">
                                                <td className="px-4 py-2 text-sm">
                                                    <NoMaxWidthTooltip title={trade.transaction_hash} placement="top-start">
                                                    <a 
                                                        href={`/tx/${trade.transaction_hash}`} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="text-blue-500 hover:text-blue-700 truncate"
                                                    >
                                                        {trade.transaction_hash.substring(0, 10)}...
                                                    </a>
                                                    </NoMaxWidthTooltip>
                                                </td>
                                                <td className="px-4 py-2 text-sm text-gray-900">
                                                    {trade.fromToken.symbol} &rarr; {trade.toToken.symbol}
                                                </td>
                                                <td className="px-4 py-2 text-sm text-gray-900">
                                                    {trade.fromAmount.toLocaleString('en-US', {
                                                        minimumFractionDigits: 0,
                                                        maximumFractionDigits: 2,
                                                    })}{' '}
                                                    {trade.fromToken.symbol}{' '}
                                                    &rarr;{' '}
                                                    {trade.toAmount.toLocaleString('en-US', {
                                                        minimumFractionDigits: 0,
                                                        maximumFractionDigits: 2,
                                                    })}{' '}
                                                    {trade.toToken.symbol}
                                                </td>
                                                <td className="px-4 py-2 text-sm text-gray-500 text-right">
                                                    {formatDistanceToNow(new Date(`${trade.time}Z`), { addSuffix: true, locale: enUS })}
                                                </td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};