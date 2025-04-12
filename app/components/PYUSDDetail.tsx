/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from 'react';
import { CryptoData } from '../types';
import { getTokenDetails } from '../services/poolService';
import PriceChart from './PriceChart';
import { getSolanaTokenDetails, getPyUSDPriceHistory } from '../services/blockchain';
import { ArrowUp, ArrowDown, DollarSign, Percent, TrendingUp, Activity, Globe } from 'lucide-react';
import Tooltip from '@mui/material/Tooltip';
import { FiCopy } from 'react-icons/fi';

interface PYUSDDetailProps {
    data: CryptoData | null;
    totalSupply: string;
};

interface TokenSymbolCache {
    [address: string]: string;
};

export default function PYUSDDetail({ data, totalSupply }: PYUSDDetailProps) {
    const [tokenSymbols, setTokenSymbols] = useState<TokenSymbolCache>({});
    const [tokenPairs, setTokenPairs] = useState<{[key: string]: string}>({});
    const [priceHistory, setPriceHistory] = useState([]);
    const [totalVolumes, setTotalVolumes] = useState([]);
    const [valueCopied, setValueCopied] = useState('Copy Address');
    const [currency, setCurrency] = useState<string>("usd");
    const currencies = ["usd", "eur", "aud", "aed", "ars", 'idr', "sgd", "jpy", "krw", "cny", "btc", "eth"];
    const currencySymbols: Record<string, string> = {
        usd: "$",
        eur: "€",
        aud: "A$",
        aed: "د.إ",
        ars: "$",
        idr: "Rp",
        sgd: "S$",
        jpy: "¥",
        krw: "₩",
        cny: "¥",
        btc: "₿",
        eth: "Ξ",
    };

    const handleCopy = (address: string) => {
        navigator.clipboard.writeText(address);
        setValueCopied('Copied!');
    };

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(num);
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency.toUpperCase(),
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(value);
    };

    const formatPercentage = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'percent',
            minimumFractionDigits: 2,
            maximumFractionDigits: 4,
        }).format(value / 100);
    };

    const determineNetwork = (addressBase: string, addressTarget: string): 'Ethereum' | 'Solana' | 'Unknown' => {
        if (addressBase.length > 10 || addressTarget.length > 10) {
            if (addressBase.toLowerCase().startsWith('0x') || addressTarget.toLowerCase().startsWith('0x')) {
                return 'Ethereum';
            } else {
                return 'Solana';
            }
        } else if (addressBase.toUpperCase() === 'SOL' || addressTarget.toUpperCase() === 'SOL') {
            return 'Solana';
        }
        return 'Ethereum';
    };

    const getTokenSymbol = async (address: string) => {
        const normalizedAddress = address.toUpperCase();
        
        if (tokenSymbols[normalizedAddress]) {
            return tokenSymbols[normalizedAddress];
        }

        if (address.length > 10 && normalizedAddress.startsWith('0X')) {
            try {
                const tokenData = await getTokenDetails(normalizedAddress);
                
                setTokenSymbols(prev => ({
                    ...prev,
                    [normalizedAddress]: tokenData.symbol
                }));

                return tokenData.symbol;
            } catch (error) {
                console.error(`Error fetching token details for ${address}:`, error);
                return `${address.slice(0, 6)}...${address.slice(-4)}`;
            }
        } else if (address.length > 10) {
            try {
                const tokenData = await getSolanaTokenDetails(normalizedAddress);
                setTokenSymbols(prev => ({
                    ...prev,
                    [normalizedAddress]: tokenData.symbol
                }));

                return tokenData.symbol;
            } catch (error) {
                console.error(`Error fetching token details for ${address}:`, error);
                return `${address.slice(0, 6)}...${address.slice(-4)}`;
            }
        } else {
            return address;
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            setValueCopied('Copy Address');
        }, 1000);
        return () => clearTimeout(timer);
    }, [valueCopied]);

    useEffect(() => {
        const fetchPairSymbols = async () => {
            if (data?.tickers) {
                const pairSymbols: {[key: string]: string} = {};
                
                for (const ticker of data.tickers) {
                    const baseSymbol = await getTokenSymbol(ticker.base);
                    const targetSymbol = await getTokenSymbol(ticker.target);
                    
                    pairSymbols[`${ticker.base}/${ticker.target}`] = `${baseSymbol}/${targetSymbol}`;
                }
                
                setTokenPairs(pairSymbols);
            }
        };

        const fetchPriceHistory = async () => {
            try {
                const data = await getPyUSDPriceHistory();
                setPriceHistory(data.prices);
                setTotalVolumes(data.total_volumes);
            } catch (error) {
                console.error('Error fetching price history:', error);
            }
        };

        fetchPairSymbols();
        fetchPriceHistory();
    }, [data]);

    const renderTokenPair = (base: string, target: string) => {
        return tokenPairs[`${base}/${target}`] || `${base}/${target}`;
    };

    // Type-safe price change percentage getters
    const getPriceChange24h = (): number => {
        return data?.market_data?.price_change_percentage_24h ?? 0;
    };

    const getPriceChange7d = (): number => {
        return data?.market_data?.price_change_percentage_7d ?? 0;
    };

    const getPriceChange30d = (): number => {
        return data?.market_data?.price_change_percentage_30d ?? 0;
    };

    const getPriceChange1y = (): number => {
        return data?.market_data?.price_change_percentage_1y ?? 0;
    };

    const getCurrentPrice = (): number => {
        return data?.market_data?.current_price?.[currency] ?? 0;
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                {/* Header Section */}
                <div className="flex justify-between items-center bg-white rounded-lg shadow p-6 mb-8">
                    <div className="flex items-center space-x-4">
                        <img 
                            src={data?.image?.large} 
                            alt={data?.name || "Token"} 
                            className="h-16 w-16 rounded-full"
                        />
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">
                                {data?.name || "Token"} ({data?.symbol?.toUpperCase() || ""})
                            </h1>
                            <div className="flex items-center space-x-2 text-gray-600 mt-1">
                                <span className="bg-blue-100 text-blue-800 font-medium px-2 py-0.5 rounded text-xs">
                                    Rank #{data?.market_cap_rank || "N/A"}
                                </span>
                                {data?.categories?.map((category, index) => (
                                    <span key={index} className="bg-gray-100 text-gray-800 font-medium px-2 py-0.5 rounded text-xs">
                                        {category}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex flex-col items-center space-x-4 ml-4 gap-2">
                        <div className="bg-white p-1 rounded-md shadow-sm border text-xs max-w-13 w-full place-self-end">
                            <select 
                                value={currency}
                                onChange={(e) => setCurrency(e.target.value)}
                                className="outline-none text-gray-700 cursor-pointer"
                            >
                                {currencies.map(curr => (
                                    <option key={curr} value={curr}>{curr.toUpperCase()}</option>
                                ))}
                            </select>
                        </div>
                        <span className="text-gray-500 text-sm">
                            Last updated: {data?.last_updated && new Date(data.last_updated).toLocaleString('en-Us', { timeZone: "UTC", year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" })} UTC
                        </span>
                    </div>
                </div>

                {/* Token Contract Info */}
                <div className="bg-white rounded-lg shadow p-6 mb-8">
                    <h3 className="text-lg font-medium mb-4 flex items-center">
                        <Globe size={18} className="mr-2" />
                        Token Information
                    </h3>
                    <div className="space-y-4">
                        <h4 className="text-gray-500 text-sm mb-2">Platforms</h4>
                        <div className="space-y-2">
                            {data?.platforms && Object.entries(data.platforms).map(([platform, address]) => (
                                <div key={platform} className="bg-gray-50 p-3 rounded-lg">
                                    <div className="font-medium capitalize mb-1">{platform}</div>
                                    <div className='flex items-center gap-2'>
                                        <div className="text-sm text-gray-600 break-all">{address}</div>
                                        <Tooltip title={valueCopied} placement="top">
                                        <button
                                            onClick={() => handleCopy(address)}
                                            className='cursor-pointer hover:text-blue-600 hover:scale-110'
                                        >
                                            <FiCopy size={14} />
                                        </button>
                                        </Tooltip>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Price Overview */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h2 className="text-gray-500 text-sm mb-2 flex items-center">
                            <DollarSign size={16} className="mr-1" />
                            Current Price
                        </h2>
                        <div className="flex-wrap items-baseline">
                            <span className="text-3xl font-bold">
                                {currencySymbols[currency]}{getCurrentPrice().toLocaleString('en-US', { style: 'decimal', maximumFractionDigits: 8, minimumFractionDigits: 2 })}
                            </span>
                            <span className={`ml-2 flex items-center text-sm ${getPriceChange24h() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {getPriceChange24h() >= 0 ? 
                                    <ArrowUp size={14} className="mr-1" /> : 
                                    <ArrowDown size={14} className="mr-1" />}
                                {formatPercentage(Math.abs(getPriceChange24h()))} (24h)
                            </span>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                            <div>
                                <span className="text-gray-500">All Time High:</span>
                                <div className="font-medium">{currencySymbols[currency]}{data?.market_data?.ath?.[currency]?.toLocaleString('en-US', { style: 'decimal', maximumFractionDigits: 8, minimumFractionDigits: 2 }) || "0.00"}</div>
                            </div>
                            <div>
                                <span className="text-gray-500">All Time Low:</span>
                                <div className="font-medium">{currencySymbols[currency]}{data?.market_data?.atl?.[currency]?.toLocaleString('en-US', { style: 'decimal', maximumFractionDigits: 8, minimumFractionDigits: 2 }) || "0.00"}</div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow over">
                        <h2 className="text-gray-500 text-sm mb-2 flex items-center">
                            <TrendingUp size={16} className="mr-1" />
                            Market Stats
                        </h2>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <div className="text-gray-500 text-xs">Market Cap</div>
                                <div className="font-medium line-clamp-3">{formatCurrency(data?.market_data?.market_cap?.[currency] ?? 0)}</div>
                            </div>
                            <div>
                                <div className="text-gray-500 text-xs">24h Volume</div>
                                <div className="font-medium line-clamp-3">{formatCurrency(data?.market_data?.total_volume?.[currency] ?? 0)}</div>
                            </div>
                            <div>
                                <div className="text-gray-500 text-xs">Circulating Supply</div>
                                <div className="font-medium line-clamp-3">{formatNumber(data?.market_data?.circulating_supply ?? 0)} {data?.symbol?.toUpperCase() || ""}</div>
                            </div>
                            <div>
                                <div className="text-gray-500 text-xs">Max Total Supply</div>
                                <div className="font-medium line-clamp-3">{totalSupply} {data?.symbol?.toUpperCase() || ""}</div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow">
                        <h2 className="text-gray-500 text-sm mb-2 flex items-center">
                            <Percent size={16} className="mr-1" />
                            Price Change
                        </h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <div className="text-gray-500 text-xs">24 Hours</div>
                                <div className={`font-medium flex items-center ${getPriceChange24h() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {getPriceChange24h() >= 0 ? 
                                        <ArrowUp size={14} className="mr-1" /> : 
                                        <ArrowDown size={14} className="mr-1" />}
                                    {formatPercentage(Math.abs(getPriceChange24h()))}
                                </div>
                            </div>
                            <div>
                                <div className="text-gray-500 text-xs">7 Days</div>
                                <div className={`font-medium flex items-center ${getPriceChange7d() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {getPriceChange7d() >= 0 ? 
                                        <ArrowUp size={14} className="mr-1" /> : 
                                        <ArrowDown size={14} className="mr-1" />}
                                    {formatPercentage(Math.abs(getPriceChange7d()))}
                                </div>
                            </div>
                            <div>
                                <div className="text-gray-500 text-xs">30 Days</div>
                                <div className={`font-medium flex items-center ${getPriceChange30d() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {getPriceChange30d() >= 0 ? 
                                        <ArrowUp size={14} className="mr-1" /> : 
                                        <ArrowDown size={14} className="mr-1" />}
                                    {formatPercentage(Math.abs(getPriceChange30d()))}
                                </div>
                            </div>
                            <div>
                                <div className="text-gray-500 text-xs">1 Year</div>
                                <div className={`font-medium flex items-center ${getPriceChange1y() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {getPriceChange1y() >= 0 ? 
                                        <ArrowUp size={14} className="mr-1" /> : 
                                        <ArrowDown size={14} className="mr-1" />}
                                    {formatPercentage(Math.abs(getPriceChange1y()))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Price Chart */}
                <div className="bg-white rounded-lg shadow p-6 mb-8">
                    <h2 className="text-lg font-medium mb-4 flex items-center">
                        <Activity size={18} className="mr-2" />
                        Price Chart
                    </h2>
                    {priceHistory.length > 0 ? (
                        <PriceChart prices={priceHistory} total_volumes={totalVolumes} />
                    ) : (
                        <div className="h-64 flex items-center justify-center text-gray-500">
                            Loading price chart data...
                        </div>
                    )}
                </div>

                {/* About Section */}
                <div className="bg-white rounded-lg shadow p-6 mb-8">
                    <h2 className="text-lg font-medium mb-4">About {data?.name || "Token"}</h2>
                    <p className="text-gray-700">{data?.description?.en || "No description available."}</p>
                    
                    <div className="mt-4 pt-4 border-t border-gray-100">
                        <h3 className="text-gray-500 text-sm mb-2">Links</h3>
                        <div className="flex flex-wrap gap-2">
                            {data?.links?.homepage && data.links.homepage[0] && (
                                <a 
                                    href={data.links.homepage[0]} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-sm hover:bg-blue-100"
                                >
                                    <Globe size={14} className="mr-1" />
                                    Website
                                </a>
                            )}
                            {data?.links?.twitter_screen_name && (
                                <a 
                                    href={`https://twitter.com/${data.links.twitter_screen_name}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-sm hover:bg-blue-100"
                                >
                                    Twitter
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                {/* Trading Pairs Table */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <h2 className="text-xl font-bold p-6 border-b">Trading Pairs</h2>
                    <div className="overflow-x-auto max-h-96">
                        <table className="min-w-full divide-y divide-gray-200 relative">
                            <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase">Pair</th>
                                    <th className="py-3 text-left text-sm font-semibold text-gray-700 uppercase">Market</th>
                                    <th className="px-2 py-3 text-right text-sm font-semibold text-gray-700 uppercase">Last Price</th>
                                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700 uppercase">Volume</th>
                                    <th className="pl-2 pr-6 py-3 text-right text-sm font-semibold text-gray-700 uppercase">Trust Score</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {data?.tickers?.map((ticker, index) => (
                                <tr key={index}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className='flex gap-2'>
                                            <span>{renderTokenPair(ticker.base, ticker.target)}</span>
                                            <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs text-white bg-gray-400'>{determineNetwork(ticker.base, ticker.target)}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 whitespace-nowrap">
                                        {ticker.market.name}
                                    </td>
                                    <td className="px-2 py-4 whitespace-nowrap text-right">
                                        {ticker.last.toFixed(4)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        {formatNumber(ticker.volume)}
                                    </td>
                                    <td className="pl-2 pr-6 py-4 whitespace-nowrap text-right">
                                        {ticker.trust_score && (
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                                                ticker.trust_score === 'green' ? 'bg-green-100 text-green-800' :
                                                ticker.trust_score === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-red-100 text-red-800'
                                                }`}>
                                                {ticker.trust_score}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};
