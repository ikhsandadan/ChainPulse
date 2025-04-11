/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { TransactionFlow, Transaction } from '../types';
import { ethers } from 'ethers';
import Tooltip from '@mui/material/Tooltip';
import { FiCopy } from 'react-icons/fi';

import { getETHPrice, checkImageURL } from '../services/blockchain';
import { NUMERIC_FORMAT_KEYS } from '../types';

interface Props {
    flow: TransactionFlow;
};

interface TokenLogoProps {
    logoURI: string;
    symbol: string;
};

function TokenLogo({ logoURI, symbol }: TokenLogoProps) {
    const [url, setUrl] = useState<string>(logoURI);

    useEffect(() => {
        async function fetchImageURL() {
            const fetchedURL = await checkImageURL(logoURI);
            setUrl(fetchedURL);
        }
        fetchImageURL();
    }, [logoURI]);

    return (
        <img
            src={url}
            alt={symbol}
            className="w-full h-full object-cover"
        />
    );
};

const formatBigNumber = (value : any) => {
    if (!value) return '0';
    try {
        const bigInt = BigInt(value.toString());
        if (bigInt > BigInt('1000000000000000')) {
            return `${ethers.formatEther(bigInt)}`;
        }
        // Add commas to large numbers
        return bigInt.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    } catch (e) {
        console.error(e);
        return value.toString();
    }
};

export default function TransactionDetails({ flow }: Props) {
    const [activeTab, setActiveTab] = useState('overview');
    const [valueCopied, setValueCopied] = useState('Copy Address');

    function getTokenByAddress(address: string) {
        if (!flow?.tokens) return null;
        return flow.tokens.find(t => 
            t.address.toLowerCase() === address.toLowerCase()
        );
    };

    const formatAddress = (value: unknown): string => {
        if (typeof value === 'string' && value.length >= 42 && value.toLowerCase().startsWith('0x')) {
            return `${value}`;
        }
        return String(value);
    };
    
    function formatValue(value: unknown): string {
        if (typeof value === 'string' && value.length >= 42 && value.toLowerCase().startsWith('0x')) {
            return `${value}`;
        }
        return String(value);
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
        <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">Transaction Details</h2>
            
            <div className="border-b border-gray-200 mb-4">
                <nav className="flex space-x-6">
                    <button
                        className={`pb-2 px-1 cursor-pointer ${activeTab === 'overview' ? 'border-b-2 border-blue-500 font-medium text-blue-600' : 'text-gray-500'}`}
                        onClick={() => setActiveTab('overview')}
                    >
                        Overview
                    </button>
                    <button
                        className={`pb-2 px-1 cursor-pointer ${activeTab === 'logs' ? 'border-b-2 border-blue-500 font-medium text-blue-600' : 'text-gray-500'}`}
                        onClick={() => setActiveTab('logs')}
                    >
                        Event Logs
                    </button>
                    <button
                        className={`pb-2 px-1 cursor-pointer ${activeTab === 'tokens' ? 'border-b-2 border-blue-500 font-medium text-blue-600' : 'text-gray-500'}`}
                        onClick={() => setActiveTab('tokens')}
                    >
                        Tokens
                    </button>
                </nav>
            </div>
            
            {activeTab === 'overview' && (
                <div>
                    <h3 className="text-lg font-semibold mb-2">Transaction Information</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <tbody className="divide-y divide-gray-200">
                                {flow.transactions.map((tx, index) => (
                                    <TransactionRow key={index} transaction={tx} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            
            {activeTab === 'logs' && (
                <div>
                    <h3 className="text-lg font-semibold mb-2">Event Logs</h3>
                    {flow.decodedAllEventLogs && flow.decodedAllEventLogs.length > 0 ? (
                        <div className="space-y-4">
                            {flow.decodedAllEventLogs.map((log, index) => (
                                <div key={index}>
                                    {log.eventType.toLowerCase() !== 'unknown' && (
                                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center">
                                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                                        log.eventType.toLowerCase().includes('transfer') ? 'bg-blue-100 text-blue-800' :
                                                        log.eventType.toLowerCase().includes('swap') ? 'bg-purple-100 text-purple-800' :
                                                        log.eventType.toLowerCase().includes('liquidity') ? 'bg-green-100 text-green-800' :
                                                        log.eventType.toLowerCase().includes('approval') ? 'bg-yellow-100 text-yellow-800' :
                                                        log.eventType.toLowerCase().includes('exchange') ? 'bg-red-100 text-red-800' :
                                                        log.eventType.toLowerCase().includes('mint') ? 'bg-indigo-100 text-indigo-800' :
                                                        log.eventType.toLowerCase().includes('burn') ? 'bg-pink-100 text-pink-800' :
                                                        log.eventType.toLowerCase().includes('withdraw') ? 'bg-orange-100 text-orange-800' :
                                                        log.eventType.toLowerCase().includes('deposit') ? 'bg-cyan-100 text-cyan-800' :
                                                        log.eventType.toLowerCase().includes('wrap') ? 'bg-teal-100 text-teal-800' :
                                                        log.eventType.toLowerCase().includes('trade') ? 'bg-rose-100 text-rose-800' :
                                                        log.eventType.toLowerCase().includes('reserve') ? 'bg-fuchsia-100 text-fuchsia-800' :
                                                        log.eventType.toLowerCase().includes('interaction') ? 'bg-sky-100 text-sky-800' :
                                                        log.eventType.toLowerCase().includes('supply') ? 'bg-amber-100 text-amber-800' :
                                                        log.eventType.toLowerCase().includes('stake') ? 'bg-emerald-100 text-emerald-800' :
                                                        log.eventType.toLowerCase().includes('bought') ? 'bg-violet-100 text-violet-800' :
                                                        log.eventType.toLowerCase().includes('loan') ? 'bg-rose-100 text-rose-800' :
                                                        log.eventType.toLowerCase().includes('pay') ? 'bg-sky-100 text-sky-800' :
                                                        log.eventType.toLowerCase().includes('collect') ? 'bg-amber-100 text-amber-800' :
                                                        log.eventType.toLowerCase().includes('fee') ? 'bg-rose-100 text-rose-700' :
                                                        log.eventType.toLowerCase().includes('data') ? 'bg-sky-100 text-sky-700' :
                                                        log.eventType.toLowerCase().includes('sync') ? 'bg-amber-100 text-amber-700' :
                                                        log.eventType.toLowerCase().includes('order') ? 'bg-sky-100 text-sky-700' :
                                                        log.eventType.toLowerCase().includes('token') ? 'bg-indigo-100 text-indigo-700' :
                                                        log.eventType.toLowerCase().includes('claim') ? 'bg-pink-100 text-pink-700' :
                                                        log.eventType.toLowerCase().includes('reward') ? 'bg-teal-100 text-teal-700' :
                                                        log.eventType.toLowerCase().includes('sell') ? 'bg-pink-100 text-pink-600' :
                                                        log.eventType.toLowerCase().includes('to') ? 'bg-teal-100 text-teal-600' :
                                                        log.eventType.toLowerCase().includes('update') ? 'bg-pink-100 text-pink-600' :
                                                        log.eventType.toLowerCase().includes('bridge') ? 'bg-teal-100 text-teal-600' :
                                                        log.eventType.toLowerCase().includes('from') ? 'bg-pink-100 text-pink-600' :
                                                        log.eventType.toLowerCase().includes('call') ? 'bg-teal-100 text-teal-600' :
                                                        log.eventType.toLowerCase().includes('vault') ? 'bg-pink-100 text-pink-600' :
                                                        log.eventType.toLowerCase().includes('purchase') ? 'bg-teal-100 text-teal-600' :
                                                        'bg-gray-100 text-gray-800'
                                                    }`}>
                                                        {log.eventType}
                                                    </span>
                                                </div>
                                                <div className='flex gap-2'>
                                                    <Tooltip title={formatAddress(log.address)} placement="top">
                                                    <span className="text-xs text-gray-500 font-mono">
                                                        {formatAddress(log.address).substring(0, 8)}...{formatAddress(log.address).substring(formatAddress(log.address).length - 6)}
                                                    </span>
                                                    </Tooltip>
                                                    <Tooltip title={valueCopied} placement="top">
                                                    <button
                                                        onClick={() => handleCopy(log.address)}
                                                        className='cursor-pointer hover:text-blue-600 hover:scale-110'
                                                    >
                                                        <FiCopy size={14} />
                                                    </button>
                                                    </Tooltip>
                                                </div>
                                            </div>
                                            
                                            {log.eventType === 'AddLiquidity' && log.decoded && (
                                                <div className="mb-3 bg-green-50 p-3 rounded-md">
                                                    <p className="flex gap-2 items-center text-sm text-gray-700 mb-1">
                                                        <Tooltip title={formatAddress(log.decoded.provider)} placement="top">
                                                        <span className="font-medium">Provider: {formatAddress(log.decoded.provider).substring(0, 8)}...{formatAddress(log.decoded.provider).substring(formatAddress(log.decoded.provider).length - 6)}</span> 
                                                        </Tooltip>
                                                        <Tooltip title={valueCopied} placement="top">
                                                        <button
                                                            onClick={() => handleCopy(formatAddress(log.decoded.provider))}
                                                            className='cursor-pointer hover:text-blue-600 hover:scale-110'
                                                        >
                                                            <FiCopy size={14} />
                                                        </button>
                                                        </Tooltip>
                                                    </p>
                                                    <p className="text-sm text-gray-700 mb-1">
                                                        <span className="font-medium">Token Supply:</span> {formatBigNumber(log.decoded.tokenSupply)}
                                                    </p>
                                                    <p className="text-sm text-gray-700">
                                                        <span className="font-medium">Invariant:</span> {formatBigNumber(log.decoded.invariant)}
                                                    </p>
                                                </div>
                                            )}
                                            
                                            {log.eventType.toLowerCase().includes('swap') && log.decoded && (() => {
                                                const inData = Object.entries(log.decoded).filter(([key]) =>
                                                    key.toLowerCase().includes("amount") && key.toLowerCase().includes("in")
                                                );
                                                const outData = Object.entries(log.decoded).filter(([key]) =>
                                                    key.toLowerCase().includes("amount") && key.toLowerCase().includes("out")
                                                );

                                                const hasData = inData.length > 0 || outData.length > 0;

                                                return (
                                                    <div className={`${hasData ? 'bg-purple-50 mb-3 p-3' : ''} rounded-md`}>
                                                        <div className="grid grid-cols-3 gap-4">
                                                            <div className="flex flex-col">
                                                            {inData.map(([key, value], index) => {
                                                                const formattedKey = key
                                                                .replace(/([A-Z])/g, " $1")
                                                                .replace(/^./, (str) => str.toUpperCase())
                                                                .trim();
                                                                return (
                                                                <div key={index} className="mb-2">
                                                                    <p className="text-sm font-medium text-gray-800">
                                                                    {formattedKey}
                                                                    </p>
                                                                    <p className="text-sm text-gray-700">{formatValue(value)}</p>
                                                                </div>
                                                                );
                                                            })}
                                                            </div>

                                                            <div className="flex items-center justify-center">
                                                            {(inData.length > 0 && outData.length > 0) && (
                                                                <div className="text-gray-500 font-bold">→</div>
                                                            )}
                                                            </div>

                                                            <div className="flex flex-col">
                                                            {outData.map(([key, value], index) => {
                                                                const formattedKey = key
                                                                .replace(/([A-Z])/g, " $1")
                                                                .replace(/^./, (str) => str.toUpperCase())
                                                                .trim();
                                                                return (
                                                                <div key={index} className="mb-2">
                                                                    <p className="text-sm font-medium text-gray-800">
                                                                    {formattedKey}
                                                                    </p>
                                                                    <p className="text-sm text-gray-700">{formatValue(value)}</p>
                                                                </div>
                                                                );
                                                            })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })()}

                                            {/* Display decoded data */}
                                            {log.decoded && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {Object.entries(log.decoded)
                                                    .map(([key, value], i) => {
                                                        const formattedKey = key
                                                        .replace(/([A-Z])/g, ' $1')
                                                        .replace(/^./, (str) => str.toUpperCase())
                                                        .trim();

                                                        if (key === 'provider') {
                                                            if (Array.isArray(value)) {
                                                                return (
                                                                <div key={i} className="border-b pb-3">
                                                                    <p className="text-sm text-gray-600 font-medium mb-1">
                                                                    {formattedKey}
                                                                    </p>
                                                                    <div className="space-y-1">
                                                                    {value.map((item, idx) => (
                                                                        <p key={idx} className="text-sm text-gray-900">
                                                                        {formatValue(item)}
                                                                        </p>
                                                                    ))}
                                                                    </div>
                                                                </div>
                                                                );
                                                            } else if (typeof value === 'object' && value !== null) {
                                                                const numericKeys = Object.keys(value).filter((k) => !isNaN(Number(k)));
                                                                return (
                                                                <div key={i} className="border-b pb-3">
                                                                    <p className="text-sm text-gray-600 font-medium mb-1">
                                                                    {formattedKey}
                                                                    </p>
                                                                    <div className="space-y-1">
                                                                    {numericKeys.map((numKey, idx) => (
                                                                        <p key={idx} className="text-sm text-gray-900">
                                                                        {formatValue((value as Record<string, any>)[numKey])}
                                                                        </p>
                                                                    ))}
                                                                    </div>
                                                                </div>
                                                                );
                                                            } else {
                                                                return (
                                                                <div key={i} className="border-b pb-3">
                                                                    <p className="text-sm text-gray-600 font-medium mb-1">
                                                                    {formattedKey}
                                                                    </p>
                                                                    <div className="flex items-center gap-2">
                                                                    <Tooltip title={formatAddress(value)} placement="top">
                                                                    <p className="text-sm text-gray-900">{formatValue(value).substring(0, 8) + '...' + formatValue(value).substring(formatValue(value).length - 6)}</p>
                                                                    </Tooltip>
                                                                    <Tooltip title={valueCopied} placement="top">
                                                                        <button
                                                                            onClick={() => handleCopy(formatValue(value))}
                                                                            className="cursor-pointer hover:text-blue-600 hover:scale-110"
                                                                        >
                                                                        <FiCopy size={14} />
                                                                        </button>
                                                                    </Tooltip>
                                                                    </div>
                                                                </div>
                                                                );
                                                            }
                                                        }

                                                        if (key === 'tokenAmounts') {
                                                            if (Array.isArray(value)) {
                                                                return (
                                                                <div key={i} className="border-b pb-3">
                                                                    <p className="text-sm text-gray-600 font-medium mb-1">
                                                                    {formattedKey}
                                                                    </p>
                                                                    <div className="space-y-1">
                                                                    [ {value.map((item) => formatValue(item)).join('\u00A0\u00A0')} ]
                                                                    </div>
                                                                </div>
                                                                );
                                                            } else if (typeof value === 'object' && value !== null) {
                                                                const numericKeys = Object.keys(value).filter((k) => !isNaN(Number(k)));
                                                                return (
                                                                <div key={i} className="border-b pb-3">
                                                                    <p className="text-sm text-gray-600 font-medium mb-1">
                                                                    {formattedKey}
                                                                    </p>
                                                                    <div className="space-y-1">
                                                                    {numericKeys.map((numKey, idx) => (
                                                                        <p key={idx} className="text-sm text-gray-900">
                                                                        {formatValue((value as Record<string, any>)[numKey])}
                                                                        </p>
                                                                    ))}
                                                                    </div>
                                                                </div>
                                                                );
                                                            } else {
                                                                return (
                                                                <div key={i} className="border-b pb-3">
                                                                    <p className="text-sm text-gray-600 font-medium mb-1">
                                                                    {formattedKey}
                                                                    </p>
                                                                    <p className="text-sm text-gray-900">{formatValue(value)}</p>
                                                                </div>
                                                                );
                                                            }
                                                        }

                                                        if (formattedKey.toLowerCase() === 'fees') {
                                                            if (Array.isArray(value)) {
                                                                return (
                                                                <div key={i} className="border-b pb-3">
                                                                    <p className="text-sm text-gray-600 font-medium mb-1">
                                                                    {formattedKey}
                                                                    </p>
                                                                    <div className="space-y-1">
                                                                    [ {value.map((item) => formatValue(item)).join('\u00A0\u00A0')} ]
                                                                    </div>
                                                                </div>
                                                                );
                                                            } else if (typeof value === 'object' && value !== null) {
                                                                const numericKeys = Object.keys(value).filter((k) => !isNaN(Number(k)));
                                                                return (
                                                                <div key={i} className="border-b pb-3">
                                                                    <p className="text-sm text-gray-600 font-medium mb-1">
                                                                    {formattedKey}
                                                                    </p>
                                                                    <div className="space-y-1">
                                                                    {numericKeys.map((numKey, idx) => (
                                                                        <p key={idx} className="text-sm text-gray-900">
                                                                        {formatValue((value as Record<string, any>)[numKey])}
                                                                        </p>
                                                                    ))}
                                                                    </div>
                                                                </div>
                                                                );
                                                            } else {
                                                                return (
                                                                <div key={i} className="border-b pb-3">
                                                                    <p className="text-sm text-gray-600 font-medium mb-1">
                                                                    {formattedKey}
                                                                    </p>
                                                                    <p className="text-sm text-gray-900">{formatValue(value)}</p>
                                                                </div>
                                                                );
                                                            }
                                                        }

                                                        const isAddress = typeof value === 'string' && value.startsWith('0x') && value.length === 42;
                                                        const token = isAddress ? getTokenByAddress(value) : null;

                                                        return (
                                                        <div key={i} className="border-b pb-3">
                                                            <p className="text-sm text-gray-600 font-medium mb-1">{formattedKey}</p>

                                                            {token ? (
                                                            <div className="flex items-center">
                                                                <div className="w-8 h-8 rounded-full mr-2 overflow-hidden">
                                                                {token.logoURI ? (
                                                                    <TokenLogo logoURI={token.logoURI} symbol={token.symbol} />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center bg-gray-300 text-gray-600">
                                                                    {token.symbol.substring(0, 2)}
                                                                    </div>
                                                                )}
                                                                </div>
                                                                <div>
                                                                <p className="text-sm font-medium">{token.name}</p>
                                                                <p className="text-sm text-gray-600">{token.symbol}</p>
                                                                <p className="flex gap-2 items-center text-xs text-gray-500 font-mono">
                                                                    <Tooltip title={formatAddress(value)} placement="top">
                                                                    <span>
                                                                        {formatAddress(value).substring(0, 8)}...
                                                                        {formatAddress(value).substring(formatAddress(value).length - 6)}
                                                                    </span>
                                                                    </Tooltip>
                                                                    <Tooltip title={valueCopied} placement="top">
                                                                    <button
                                                                        onClick={() => handleCopy(formatAddress(value))}
                                                                        className="cursor-pointer hover:text-blue-600 hover:scale-110"
                                                                    >
                                                                        <FiCopy size={14} />
                                                                    </button>
                                                                    </Tooltip>
                                                                </p>
                                                                </div>
                                                            </div>
                                                            ) : (
                                                            <div>
                                                                {key === 'value' && log.eventType === 'Transfer' ? (
                                                                <p className="text-sm text-gray-900">
                                                                    {parseFloat(
                                                                    ethers.formatUnits(
                                                                        value as string,
                                                                        flow.tokens.find(
                                                                        (t) => t.address.toLowerCase() === log.address.toLowerCase()
                                                                        )?.decimals || 18
                                                                    )
                                                                    ).toLocaleString('en-US', {
                                                                    maximumFractionDigits: 8,
                                                                    minimumFractionDigits: 0,
                                                                    })}
                                                                </p>
                                                                ) : Array.isArray(value) ? (
                                                                <div className="space-y-1">
                                                                    {value.map((item, idx) => (
                                                                    <p key={idx} className="text-sm text-gray-900 whitespace-pre-wrap break-all">
                                                                        {formatValue(item)}
                                                                    </p>
                                                                    ))}
                                                                </div>
                                                                ) : (
                                                                <>
                                                                    {NUMERIC_FORMAT_KEYS.has(formattedKey.toLowerCase()) ? (
                                                                    <p className="text-sm text-gray-900 whitespace-pre-wrap break-all">{formatValue(value)}</p>
                                                                    ) : (
                                                                    <div className="flex items-center gap-2">
                                                                        <Tooltip title={formatValue(value)} placement="top-start">
                                                                        <p className="text-sm text-gray-900">
                                                                            {formatValue(value).substring(0, 8)}...
                                                                            {formatValue(value).substring(formatValue(value).length - 6)}
                                                                        </p>
                                                                        </Tooltip>
                                                                        <Tooltip title={valueCopied} placement="top">
                                                                        <button
                                                                            onClick={() => handleCopy(formatValue(value))}
                                                                            className="cursor-pointer hover:text-blue-600 hover:scale-110"
                                                                        >
                                                                            <FiCopy size={14} />
                                                                        </button>
                                                                        </Tooltip>
                                                                    </div>
                                                                    )}
                                                                </>
                                                                )}
                                                            </div>
                                                            )}
                                                        </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-gray-100 p-4 rounded-md">
                            <p className="text-gray-500">No event logs available for this transaction</p>
                        </div>
                    )}
                </div>
            )}
            
            {activeTab === 'tokens' && (
                <div>
                <h3 className="text-lg font-semibold mb-2">Tokens Involved</h3>
                {flow.tokens.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {flow.tokens.map(token => (
                            <div key={token.address} className="border border-gray-200 rounded-md p-4 flex items-center">
                                <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0 mr-3 overflow-hidden">
                                    {token.logoURI ? (
                                        <TokenLogo logoURI={token.logoURI} symbol={token.symbol} />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gray-300 text-gray-600">
                                            {token.symbol[0]}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <p className="font-medium">{token.name}</p>
                                    <p className="text-sm text-gray-600">{token.symbol}</p>
                                    <div className="flex items-center gap-2 text-gray-500">
                                        <Tooltip title={formatValue(token.address)} placement="top-start">
                                        <p className="text-xs text-gray-500 font-mono">{`${token.address.substring(0, 6)}...${token.address.substring(token.address.length - 4)}`}</p>
                                        </Tooltip>
                                        <Tooltip title={valueCopied} placement="top">
                                        <button
                                            onClick={() => handleCopy(formatValue(token.address))}
                                            className="cursor-pointer hover:text-blue-600 hover:scale-110"
                                        >
                                            <FiCopy size={14} />
                                        </button>
                                        </Tooltip>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500">No tokens involved in this transaction</p>
                )}
                </div>
            )}
        </div>
    );
};

function TransactionRow({ transaction }: { transaction: Transaction }) {
    const [expanded, setExpanded] = useState(false);
    const [ethPrice, setEthPrice] = useState(0);
    const gasUsed = parseInt(transaction.gasUsed);
    const gasLimit = parseInt(transaction.gasLimit);
    const transactionFee = (parseInt(transaction.gasUsed) * parseFloat(transaction.gasPrice)) / 1e9;
    const percentage = ((gasUsed / gasLimit) * 100).toLocaleString('en-US', { style: 'decimal', maximumFractionDigits: 2, minimumFractionDigits: 0 });

    useEffect(() => {
        const fetchETHPrice = async () => {
            try {
                const price = await getETHPrice();
                setEthPrice(price);
            } catch (error) {
                console.error('Error fetching ETH price:', error);
            }
        }

        fetchETHPrice();
    }, []);
    
    return (
        <>
        <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => setExpanded(!expanded)}>
            <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full mr-2 ${transaction.status === 'success' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="font-mono text-sm">{`${transaction.hash.substring(0, 8)}...${transaction.hash.substring(transaction.hash.length - 6)}`}</span>
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex flex-col">
                    <span className="text-xs text-gray-500">From</span>
                    <span className="font-mono text-sm">{`${transaction.from.substring(0, 8)}...${transaction.from.substring(transaction.from.length - 6)}`}</span>
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex flex-col">
                    <span className="text-xs text-gray-500">To</span>
                    <span className="font-mono text-sm">{transaction.to ? `${transaction.to.substring(0, 8)}...${transaction.to.substring(transaction.to.length - 6)}` : 'Contract Creation'}</span>
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex flex-col">
                    <span className="text-xs text-gray-500">Value</span>
                    <span>{transaction.value} ETH</span>
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-right">
                <svg className={`w-5 h-5 transform transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </td>
        </tr>
        {expanded && (
            <tr>
                <td colSpan={5} className="px-6 py-4 bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-gray-500">Transaction Fee</p>
                            <div className='flex gap-2'>
                                <p>{transactionFee} ETH</p>
                                <p className='text-gray-500'>({(transactionFee * ethPrice).toLocaleString('en-US', { style: 'currency', currency: 'USD' })})</p>
                            </div>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Gas Price</p>
                            <div className='flex gap-2'>
                                <p>{parseFloat(transaction.gasPrice).toLocaleString('en-US', { style: 'decimal', maximumFractionDigits: 2, minimumFractionDigits: 0 })} Gwei</p>
                                <p className='text-gray-500'>
                                    ({new Intl.NumberFormat("en-US", {
                                        notation: "standard",
                                        useGrouping: false,
                                        maximumFractionDigits: 20,
                                    }).format(parseFloat(transaction.gasPrice) / 1e9)} ETH)
                                </p>
                            </div>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Gas Limit & Usage by Txn</p>
                            <p>{gasLimit.toLocaleString('en-US')} | {gasUsed.toLocaleString('en-US')} ({percentage}%)</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Timestamp</p>
                            <p>{new Date(transaction.timestamp * 1000).toLocaleString('en-US', { timeZone: "UTC", weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" })} UTC</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Method or Function</p>
                            <p className="font-mono">{transaction.method || 'Unknown'}</p>
                        </div>
                    </div>
                    {transaction.input && (
                        <div className="mt-4">
                            <p className="text-sm text-gray-500 mb-1">Input Data</p>
                            <div className="bg-gray-100 p-2 max-w-full overflow-x-hidden">
                                <pre className="font-mono text-xs whitespace-pre-wrap break-all">
                                    {transaction.input}
                                </pre>
                            </div>
                        </div>
                    )}
                </td>
            </tr>
        )}
        </>
    );
};
