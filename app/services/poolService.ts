/* eslint-disable @typescript-eslint/no-explicit-any */
import { ethers } from 'ethers';
import { 
    PoolData, 
    UniswapPoolData, 
    CurvePoolData, 
    UniswapPoolTransaction, 
    TokenInfo, 
    CurveTradesResponse, 
    SimplifiedTrade,
    LiquidityTokenData,
    LiquidityEvent,
    CurveLiquidityResponse
} from '../types';

// Uniswap v3 Factory ABI
export const UNISWAP_FACTORY_ABI = [
    "function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)"
];

// Uniswap V3 Pool ABI
export const UNISWAP_POOL_ABI = [
    'function token0() view returns (address)',
    'function token1() view returns (address)',
    'function fee() view returns (uint24)',
    'function tickSpacing() view returns (int24)',
    'function liquidity() view returns (uint128)',
    'function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)'
];

// Uniswap v3 fee tiers
const UNISWAP_FEE_TIERS = [100, 500, 3000, 10000, 100000]; // 0.01%, 0.05%, 0.3%, 1%, 10%

// ABI for ERC20 tokens
export const ERC20_ABI = [
    'function symbol() view returns (string)',
    'function name() view returns (string)',
    'function decimals() view returns (uint8)',
    'function balanceOf(address) view returns (uint256)'
];

const RPC_URL = process.env.NEXT_PUBLIC_GCP_RPC_URL;
const PYUSD_ADDRESS = process.env.NEXT_PUBLIC_PYUSD_CONTRACT_ADDRESS || '';
const UNISWAP_FACTORY_ADDRESS = process.env.NEXT_PUBLIC_UNISWAP_FACTORY_ADDRESS || '';

// Initialize provider with backup providers
function getProvider() {
    try {
        return new ethers.JsonRpcProvider(RPC_URL);
    } catch (error) {
        console.warn('Failed to connect to primary RPC, trying fallback:', error);
        const fallbackRPC = 'https://eth-mainnet.g.alchemy.com/v2/demo';
        return new ethers.JsonRpcProvider(fallbackRPC);
    }
};

const provider = getProvider();

// Initialize contract instance
const uniswapFactory = new ethers.Contract(UNISWAP_FACTORY_ADDRESS, UNISWAP_FACTORY_ABI, provider);

interface Token {
    address: string;
    symbol: string;
    decimals: number;
    name: string;
};

// Cache for token details to reduce RPC calls
const tokenDetailsCache = new Map<string, Token>();

export async function getTokenDetails(address: string): Promise<Token> {
    try {
        // Check cache first
        const cacheKey = address.toLowerCase();
        if (tokenDetailsCache.has(cacheKey)) {
            return tokenDetailsCache.get(cacheKey)!;
        }

        const tokenContract = new ethers.Contract(
            address,
            ERC20_ABI,
            provider
        );

        // Use Promise.allSettled to handle potential failures
        const [symbolResult, nameResult, decimalsResult] = await Promise.allSettled([
            tokenContract.symbol(),
            tokenContract.name(),
            tokenContract.decimals()
        ]);

        const symbol = symbolResult.status === 'fulfilled' ? symbolResult.value : 'Unknown';
        const name = nameResult.status === 'fulfilled' ? nameResult.value : 'Unknown';
        const decimals = decimalsResult.status === 'fulfilled' ? Number(decimalsResult.value) : 18;

        const tokenDetails = {
            address,
            symbol,
            decimals,
            name: name || symbol
        };
        
        // Cache the result
        tokenDetailsCache.set(cacheKey, tokenDetails);
        
        return tokenDetails;
    } catch (error) {
        console.error(`Error getting token details for ${address}:`, error);
        return {
            address,
            symbol: address,
            decimals: 18,
            name: 'Unknown'
        };
    }
};

// Get token price from a reliable source
async function getTokenPrice(tokenAddress: string): Promise<number> {
    try {
        const response = await fetch(`https://coins.llama.fi/prices/current/ethereum:${tokenAddress}?searchWidth=4h`);
        const data = await response.json();
        return data?.coins[`ethereum:${tokenAddress}`]?.price;
    } catch (error) {
        console.error(`Error fetching price for token ${tokenAddress}:`, error);
        return 1.0;
    }
};

// Fetch Uniswap pool volume and fees
async function fetchUniswapVolumeAndFees(poolAddress: string): Promise<{
    volume24h: number;
    fees24h: number;
    dailyData7d: { timestamp: number; volumeUSD: number; feesUSD: number }[];
}> {
    try {
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const timestamp24hAgo = currentTimestamp - 86400;
        const timestamp7dAgo = currentTimestamp - 86400 * 7;
        
        const query = `
            {
                pool(id: "${poolAddress.toLowerCase()}") {
                    feeTier
                }
                poolDayDatas(
                    first: 7,
                    orderBy: date,
                    orderDirection: desc,
                    where: {
                        pool: "${poolAddress.toLowerCase()}"
                    }
                ) {
                    date
                    volumeUSD
                    feesUSD
                }
                poolHourDatas(
                    first: 200,
                    orderBy: periodStartUnix,
                    orderDirection: desc,
                    where: {
                        pool: "${poolAddress.toLowerCase()}"
                    }
                ) {
                    periodStartUnix
                    volumeUSD
                    feesUSD
                }
            }
        `;
    
        const response = await fetch('/api/uniswap-pools', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
        });
    
        if (!response.ok) {
            throw new Error(`Network error with status ${response.status}`);
        }
    
        const data = await response.json();
        if (!data?.data) {
            throw new Error('No data returned from Uniswap TheGraph API');
        }
    
        const feeTier =
            data.data.pool?.feeTier != null
            ? parseInt(data.data.pool.feeTier, 10) / 1000000
            : 0;
    
        let volume24h = 0;
        let fees24h = 0;
    
        if (data.data.poolHourDatas && Array.isArray(data.data.poolHourDatas)) {
            const hourDatas24h = data.data.poolHourDatas
            .map((hourData: any) => ({
                startTime: parseInt(hourData.periodStartUnix, 10),
                volumeUSD: parseFloat(hourData.volumeUSD),
                feesUSD: parseFloat(hourData.feesUSD)
            }))
            .filter((hourData: any) => hourData.startTime >= timestamp24hAgo);
    
            if (hourDatas24h.length > 0) {
                volume24h = hourDatas24h.reduce(
                    (sum: number, hourData: any) => sum + hourData.volumeUSD,
                    0
                );
                fees24h = hourDatas24h.reduce(
                    (sum: number, hourData: any) => sum + hourData.feesUSD,
                    0
                );
            }
        }
    
        if (volume24h === 0 && data.data.poolDayDatas && Array.isArray(data.data.poolDayDatas)) {
            const sortedDayDatas = data.data.poolDayDatas
            .map((dayData: any) => ({
                date: parseInt(dayData.date, 10),
                volumeUSD: parseFloat(dayData.volumeUSD),
                feesUSD: parseFloat(dayData.feesUSD)
            }))
            .sort((a: any, b: any) => b.date - a.date);
    
            for (const dayData of sortedDayDatas) {
                const overlapStart = Math.max(dayData.date, timestamp24hAgo);
                const overlapEnd = Math.min(dayData.date + 86400, currentTimestamp);
                if (overlapEnd > overlapStart) {
                    const overlapRatio = (overlapEnd - overlapStart) / 86400;
                    volume24h += dayData.volumeUSD * overlapRatio;
                    fees24h += dayData.feesUSD * overlapRatio;
                }
            }
            if (fees24h === 0 && volume24h > 0 && feeTier > 0) {
                fees24h = volume24h * feeTier;
            }
        }
    
        const dailyAggregation = new Map<number, { volumeUSD: number; feesUSD: number }>();
        const startDay = Math.floor(timestamp7dAgo / 86400);
        const endDay = Math.floor(currentTimestamp / 86400);
    
        for (let d = startDay; d <= endDay; d++) {
            dailyAggregation.set(d, { volumeUSD: 0, feesUSD: 0 });
        }
    
        if (data.data.poolDayDatas && Array.isArray(data.data.poolDayDatas)) {
            for (const dayData of data.data.poolDayDatas) {
                const dayTimestamp = parseInt(dayData.date, 10);
                const dayIndex = Math.floor(dayTimestamp / 86400);
                if (dayIndex >= startDay && dayIndex <= endDay) {
                    dailyAggregation.set(dayIndex, {
                    volumeUSD: parseFloat(dayData.volumeUSD),
                    feesUSD: parseFloat(dayData.feesUSD)
                    });
                }
            }
        } else if (data.data.poolHourDatas && Array.isArray(data.data.poolHourDatas)) {
            for (const hourData of data.data.poolHourDatas) {
                const startTime = parseInt(hourData.periodStartUnix, 10);
                if (startTime >= timestamp7dAgo && startTime <= currentTimestamp) {
                    const dayIndex = Math.floor(startTime / 86400);
                    const agg = dailyAggregation.get(dayIndex)!;
                    agg.volumeUSD += parseFloat(hourData.volumeUSD);
                    agg.feesUSD += parseFloat(hourData.feesUSD);
                    dailyAggregation.set(dayIndex, agg);
                }
            }
        }
    
        let dailyData7d: { timestamp: number; volumeUSD: number; feesUSD: number }[] = [];
        const sortedDays = Array.from(dailyAggregation.keys()).sort((a, b) => a - b);
        for (const day of sortedDays) {
            const agg = dailyAggregation.get(day)!;
            dailyData7d.push({ timestamp: day * 86400, volumeUSD: agg.volumeUSD, feesUSD: agg.feesUSD });
        }
    
        dailyData7d = dailyData7d.filter((day) => day.volumeUSD !== 0 || day.feesUSD !== 0);
    
        return { volume24h, fees24h, dailyData7d };
    } catch (error) {
        console.error(`Error fetching volume and fees for pool ${poolAddress}:`, error);
        return { volume24h: 0, fees24h: 0, dailyData7d: [] };
    }
};

async function getUniswapPairedTokens(): Promise<string[]> {
    try {
        // Query TheGraph for pools involving PYUSD
        const query = `
            {
                pools(where: {
                    or: [
                        {token0: "${PYUSD_ADDRESS.toLowerCase()}"},
                        {token1: "${PYUSD_ADDRESS.toLowerCase()}"}
                    ]
                }) {
                    id
                    token0 {
                        id
                    }
                    token1 {
                        id
                    }
                    totalValueLockedUSD
                }
            }
        `;

        const response = await fetch('/api/uniswap-pools', {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
        });

        const data = await response.json();

        if (!data?.data?.pools) {
            return getFallbackPairedTokens();
        }

        // Collect tokens paired with PYUSD and sort by TVL
        const tokens = new Set<string>();
        const pools = data.data.pools.sort((a: any, b: any) => 
            parseFloat(b.totalValueLockedUSD) - parseFloat(a.totalValueLockedUSD)
        );

        for (const pool of pools) {
            if (pool.token0.id.toLowerCase() === PYUSD_ADDRESS.toLowerCase()) {
                tokens.add(pool.token1.id);
            } else {
                tokens.add(pool.token0.id);
            }
        }

        return Array.from(tokens);
    } catch (error) {
        console.error('Error fetching Uniswap paired tokens:', error);
        return getFallbackPairedTokens();
    }
};

// Fallback function for popular tokens
function getFallbackPairedTokens(): string[] {
    return [
        "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
        "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", // WBTC
        "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
        "0xdAC17F958D2ee523a2206206994597C13D831ec7", // USDT
        "0x6B175474E89094C44Da98b954EedeAC495271d0F", // DAI
        "0x853d955aCEf822Db058eb8505911ED77F175b99e"  // FRAX
    ];
};

export async function fetchUniswapPools(): Promise<UniswapPoolData[]> {
    try {
        const pairedTokens = await getUniswapPairedTokens();
        
        console.log(`Found ${pairedTokens.length} tokens paired with PYUSD on Uniswap`);
        
        const poolPromises: Promise<UniswapPoolData | null>[] = [];
        const checkedPoolAddresses = new Set<string>();

        // Check only PYUSD first pools
        for (const tokenAddress of pairedTokens) {
            for (const fee of UNISWAP_FEE_TIERS) {
                poolPromises.push(checkAndProcessUniswapPool(PYUSD_ADDRESS, tokenAddress, fee));
            }
        }
        
        const results = await Promise.allSettled(poolPromises);
        
        // Filter valid pools
        const pools: UniswapPoolData[] = [];
        for (const result of results) {
            if (result.status === 'fulfilled' && result.value !== null) {
                const poolData = result.value;
                if (!checkedPoolAddresses.has(poolData.id)) {
                    checkedPoolAddresses.add(poolData.id);
                    pools.push(poolData);
                }
            }
        }

        // Enrich with TheGraph data
        await enrichPoolsWithGraphData(pools);

        // Sort by TVL descending
        return pools.sort((a, b) => b.tvl - a.tvl);
    } catch (error) {
        console.error('Error fetching Uniswap pools:', error);
        throw new Error(`Failed to fetch Uniswap pools: ${error instanceof Error ? error.message : String(error)}`);
    }
};

async function checkAndProcessUniswapPool(
    tokenA: string, 
    tokenB: string, 
    fee: number
): Promise<UniswapPoolData | null> {
    try {
        if (tokenA.toLowerCase() === tokenB.toLowerCase()) {
            return null;
        }
        
        // Get pool address
        const poolAddress = await uniswapFactory.getPool(tokenA, tokenB, fee);
        
        // If pool doesn't exist, return null
        if (poolAddress === ethers.ZeroAddress) {
            return null;
        }
        
        // Get token0 and token1 from the pool
        const poolContract = new ethers.Contract(
            poolAddress,
            UNISWAP_POOL_ABI,
            provider
        );

        const [token0Address, token1Address] = await Promise.all([
            poolContract.token0(),
            poolContract.token1(),
        ]);

        console.log(`Checking pool ${poolAddress} with tokens ${token0Address}, ${token1Address}, fee ${fee}`);

        // Check if PYUSD is token0 (first token) in the pool
        if (token0Address.toLowerCase() !== PYUSD_ADDRESS.toLowerCase()) {
            return null;
        }
        
        return processUniswapPool(poolAddress);
    } catch (error) {
        console.error(`Error checking pool with tokens ${tokenA}, ${tokenB}, fee ${fee}:`, error);
        return null;
    }
};

async function processUniswapPool(poolAddress: string): Promise<UniswapPoolData | null> {
    try {
        const poolContract = new ethers.Contract(
            poolAddress,
            UNISWAP_POOL_ABI,
            provider
        );

        const [token0Address, token1Address, fee, liquidityBigInt] = await Promise.all([
            poolContract.token0(),
            poolContract.token1(),
            poolContract.fee(),
            poolContract.liquidity(),
        ]);

        // Check if PYUSD is involved in the pool
        if (token0Address.toLowerCase() !== PYUSD_ADDRESS.toLowerCase() && 
            token1Address.toLowerCase() !== PYUSD_ADDRESS.toLowerCase()) {
            return null;
        }

        // Try to get tickSpacing, but handle the case if it's not available
        let tickSpacing = 0;
        try {
            tickSpacing = Number(await poolContract.tickSpacing());
        } catch (error) {
            console.log(`Pool ${poolAddress} doesn't have tickSpacing method, using default value.`);
            console.log(error);
            const feeValue = Number(fee);
            if (feeValue === 100) tickSpacing = 1;
            else if (feeValue === 500) tickSpacing = 10;
            else if (feeValue === 3000) tickSpacing = 60;
            else if (feeValue === 10000) tickSpacing = 200;
        }

        // Get token details
        const [token0Details, token1Details] = await Promise.all([
            getTokenDetails(token0Address),
            getTokenDetails(token1Address)
        ]);

        // Get token balances
        const token0Contract = new ethers.Contract(token0Address, ERC20_ABI, provider);
        const token1Contract = new ethers.Contract(token1Address, ERC20_ABI, provider);

        const [balance0Bigint, balance1Bigint] = await Promise.all([
            token0Contract.balanceOf(poolAddress),
            token1Contract.balanceOf(poolAddress)
        ]);

        // Get token prices
        const [token0Price, token1Price] = await Promise.all([
            getTokenPrice(token0Address),
            getTokenPrice(token1Address)
        ]);

        // Normalize reserves
        const reserve0 = Number(ethers.formatUnits(balance0Bigint, token0Details.decimals));
        const reserve1 = Number(ethers.formatUnits(balance1Bigint, token1Details.decimals));
        
        // Calculate TVL using actual token prices
        const tvl = reserve0 * token0Price + reserve1 * token1Price;
        
        // Get 24h volume and fees using the improved method
        const { volume24h, fees24h, dailyData7d } = await fetchUniswapVolumeAndFees(poolAddress);

        let transactions: UniswapPoolTransaction[] = [];
        if (tvl > 0) {
            transactions = await fetchUniswapPoolTransactions(poolAddress);
        }
        
        // Calculate APY
        const feePercentage = Number(fee) / 1000000;
        const apy = calculateUniswapAPY(tvl, volume24h, feePercentage);

        const liquidityFormatted = ethers.formatUnits(liquidityBigInt, 18);

        return {
            id: poolAddress,
            name: `${token0Details.symbol}/${token1Details.symbol}`,
            type: 'uniswap',
            address: poolAddress,
            tokens: [token0Details, token1Details],
            tvl : tvl || 0,
            volume24h,
            apy: apy || 0,
            fees24h,
            dailyData7d,
            createdAt: Math.floor(Date.now() / 1000) - 86400 * 30,
            fee: Number(fee),
            tickSpacing,
            liquidity: liquidityFormatted.toString(),
            reserves: [reserve0, reserve1],
            transactions
        };
    } catch (error) {
        console.error(`Error processing Uniswap pool at address ${poolAddress}:`, error);
        return null;
    }
};

async function enrichPoolsWithGraphData(pools: UniswapPoolData[]): Promise<void> {
    try {
        const poolAddresses = pools.map(pool => pool.address.toLowerCase());
        if (poolAddresses.length === 0) return;
        
        const query = `
            {
                pools(where: {id_in: [${poolAddresses.map(addr => `"${addr}"`).join(',')}]}) {
                    id
                    feeTier
                    totalValueLockedUSD
                    createdAtTimestamp
                }
                
                poolDayDatas(
                    first: ${poolAddresses.length * 3},
                    orderBy: date,
                    orderDirection: desc,
                    where: {
                        pool_in: [${poolAddresses.map(addr => `"${addr}"`).join(',')}],
                        date_gte: ${Math.floor(Date.now() / 1000 - 86400 * 3) / 86400}
                    }
                ) {
                    pool {
                        id
                    }
                    volumeUSD
                    feesUSD
                    date
                }
                
                poolHourDatas(
                    first: ${poolAddresses.length * 25},
                    orderBy: periodStartUnix,
                    orderDirection: desc,
                    where: {
                        pool_in: [${poolAddresses.map(addr => `"${addr}"`).join(',')}],
                        periodStartUnix_gte: ${Math.floor(Date.now() / 1000 - 86400)}
                    }
                ) {
                    pool {
                        id
                    }
                    volumeUSD
                    feesUSD
                    periodStartUnix
                }
            }
        `;

        const response = await fetch('/api/uniswap-pools', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
        });

        const data = await response.json();
        
        // Create lookup maps for processed data
        const poolInfoMap = new Map();
        const volumeAndFeesHourlyMap = new Map();
        const volumeAndFeesDailyMap = new Map();
        
        // Process basic pool info
        if (data?.data?.pools) {
            for (const pool of data.data.pools) {
                poolInfoMap.set(pool.id, {
                    feeTier: parseInt(pool.feeTier) / 1000000,
                    tvl: parseFloat(pool.totalValueLockedUSD) || 0,
                    createdAt: parseInt(pool.createdAtTimestamp) || 0
                });
            }
        }
        
        // Process hourly data
        if (data?.data?.poolHourDatas && data.data.poolHourDatas.length > 0) {
            const currentTimestamp = Math.floor(Date.now() / 1000);
            const timestamp24hAgo = currentTimestamp - 86400;
            
            // Group hour data by pool
            for (const hourData of data.data.poolHourDatas) {
                const poolId = hourData.pool.id;
                const startTime = parseInt(hourData.periodStartUnix);
                
                // Only include hours within the 24h window
                if (startTime < timestamp24hAgo) continue;
                
                if (!volumeAndFeesHourlyMap.has(poolId)) {
                    volumeAndFeesHourlyMap.set(poolId, {
                        volume24h: 0,
                        fees24h: 0
                    });
                }
                
                const poolData = volumeAndFeesHourlyMap.get(poolId);
                poolData.volume24h += parseFloat(hourData.volumeUSD);
                poolData.fees24h += parseFloat(hourData.feesUSD);
            }
        }
        
        // Process daily data for pools that don't have hourly data
        if (data?.data?.poolDayDatas && data.data.poolDayDatas.length > 0) {
            const currentTimestamp = Math.floor(Date.now() / 1000);
            const timestamp24hAgo = currentTimestamp - 86400;
            
            // Group day data by pool
            const poolDayDataMap = new Map();
            for (const dayData of data.data.poolDayDatas) {
                const poolId = dayData.pool.id;
                if (!poolDayDataMap.has(poolId)) {
                    poolDayDataMap.set(poolId, []);
                }
                poolDayDataMap.get(poolId).push({
                    date: parseInt(dayData.date) * 86400,
                    volumeUSD: parseFloat(dayData.volumeUSD),
                    feesUSD: parseFloat(dayData.feesUSD)
                });
            }
            
            // Calculate exact 24h volume and fees for each pool
            for (const [poolId, dayDatas] of poolDayDataMap.entries()) {
                // Skip if we already have hourly data
                if (volumeAndFeesHourlyMap.has(poolId)) continue;
                
                let volume24h = 0;
                let fees24h = 0;
                
                for (const dayData of dayDatas) {
                    // Calculate what portion of this day falls within our 24h window
                    const dayEndTimestamp = dayData.date + 86400;
                    const overlapStart = Math.max(dayData.date, timestamp24hAgo);
                    const overlapEnd = Math.min(dayEndTimestamp, currentTimestamp);
                    
                    if (overlapEnd > overlapStart) {
                        const overlapRatio = (overlapEnd - overlapStart) / 86400;
                        volume24h += dayData.volumeUSD * overlapRatio;
                        fees24h += dayData.feesUSD * overlapRatio;
                    }
                }
                
                volumeAndFeesDailyMap.set(poolId, { volume24h, fees24h });
            }
        }
        
        // Update pool objects with the enriched data
        for (const pool of pools) {
            const poolId = pool.address.toLowerCase();
            const poolInfo = poolInfoMap.get(poolId);
            const volumeAndFeesHourly = volumeAndFeesHourlyMap.get(poolId);
            const volumeAndFeesDaily = volumeAndFeesDailyMap.get(poolId);
            
            if (poolInfo) {
                pool.tvl = poolInfo.tvl || pool.tvl;
                pool.createdAt = poolInfo.createdAt || pool.createdAt;
            }
            
            // Prefer hourly data, fall back to daily data
            if (volumeAndFeesHourly) {
                pool.volume24h = volumeAndFeesHourly.volume24h;
                pool.fees24h = volumeAndFeesHourly.fees24h;
            } else if (volumeAndFeesDaily) {
                pool.volume24h = volumeAndFeesDaily.volume24h;
                pool.fees24h = volumeAndFeesDaily.fees24h;
            }
            
            // If fees data isn't available but we have volume and fee tier, calculate manually
            if (pool.fees24h === 0 && pool.volume24h > 0 && pool.fee > 0) {
                pool.fees24h = pool.volume24h * (pool.fee / 1000000);
            }
            
            // Recalculate APY based on the updated values
            if (pool.tvl > 0 && pool.volume24h > 0 && pool.fee > 0) {
                pool.apy = calculateUniswapAPY(pool.tvl, pool.volume24h, pool.fee / 1000000);
            }
        }
    } catch (error) {
        console.error('Error enriching pools with graph data:', error);
    }
};

async function fetchUniswapPoolTransactions(
    poolAddress: string,
    limit: number = 200
): Promise<UniswapPoolTransaction[]> {
    try {
        const lowerPoolAddress = poolAddress.toLowerCase();
        const mintsBurnsLimit = Math.floor(limit / 2);
    
        const query = `
            {
                swaps(
                    where: { pool: "${lowerPoolAddress}" }
                    orderBy: timestamp
                    orderDirection: desc
                    first: ${limit}
                ) {
                    id
                    timestamp
                    sender
                    recipient
                    amount0
                    amount1
                    amountUSD
                    pool {
                        token0 {
                            symbol
                        }
                        token1 {
                            symbol
                        }
                    }
                }
                
                mints(
                    where: { pool: "${lowerPoolAddress}" }
                    orderBy: timestamp
                    orderDirection: desc
                    first: ${mintsBurnsLimit}
                ) {
                    id
                    timestamp
                    sender
                    amount0
                    amount1
                    amountUSD
                    pool {
                        token0 {
                            symbol
                        }
                        token1 {
                            symbol
                        }
                    }
                }
                
                burns(
                    where: { pool: "${lowerPoolAddress}" }
                    orderBy: timestamp
                    orderDirection: desc
                    first: ${mintsBurnsLimit}
                ) {
                    id
                    timestamp
                    owner
                    amount0
                    amount1
                    amountUSD
                    pool {
                        token0 {
                            symbol
                        }
                        token1 {
                            symbol
                        }
                    }
                }
            }
        `;
    
        const response = await fetch('/api/uniswap-pools', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
        });
    
        if (!response.ok) {
            throw new Error(`Network error with status ${response.status}`);
        }
    
        const result = await response.json();
    
        if (!result?.data) {
            throw new Error('No data returned from Uniswap TheGraph API');
        }
    
        const transactions: UniswapPoolTransaction[] = [];
    
        const hasNoZeroAmounts = (obj: any) =>
            parseFloat(obj.amountUSD) !== 0 &&
            parseFloat(obj.amount0) !== 0 &&
            parseFloat(obj.amount1) !== 0;
    
        if (result.data.swaps && Array.isArray(result.data.swaps)) {
            const swapTransactions = result.data.swaps
            .filter((swap: any) => hasNoZeroAmounts(swap))
            .map((swap: any): UniswapPoolTransaction => {
                const isPYUSDToken0 =
                swap.pool.token0.symbol.toUpperCase() === 'PYUSD';
                const type = isPYUSDToken0
                ? (swap.amount0.startsWith('-') ? 'sell PYUSD' : 'buy PYUSD')
                : (swap.amount1.startsWith('-') ? 'sell PYUSD' : 'buy PYUSD');
    
                return {
                    id: swap.id,
                    timestamp: parseInt(swap.timestamp, 10),
                    sender: swap.sender,
                    recipient: swap.recipient,
                    amount0: swap.amount0,
                    amount1: swap.amount1,
                    amountUSD: swap.amountUSD,
                    token0Symbol: swap.pool.token0.symbol,
                    token1Symbol: swap.pool.token1.symbol,
                    type
                };
            });
            transactions.push(...swapTransactions);
        }
    
        if (result.data.mints && Array.isArray(result.data.mints)) {
            const mintTransactions = result.data.mints
            .filter((mint: any) => hasNoZeroAmounts(mint))
            .map((mint: any): UniswapPoolTransaction => ({
                id: mint.id,
                timestamp: parseInt(mint.timestamp, 10),
                sender: mint.sender,
                recipient: mint.sender,
                amount0: mint.amount0,
                amount1: mint.amount1,
                amountUSD: mint.amountUSD,
                token0Symbol: mint.pool.token0.symbol,
                token1Symbol: mint.pool.token1.symbol,
                type: 'add'
            }));
            transactions.push(...mintTransactions);
        }
    
        if (result.data.burns && Array.isArray(result.data.burns)) {
            const burnTransactions = result.data.burns
            .filter((burn: any) => hasNoZeroAmounts(burn))
            .map((burn: any): UniswapPoolTransaction => ({
                id: burn.id,
                timestamp: parseInt(burn.timestamp, 10),
                sender: burn.owner,
                recipient: burn.owner,
                amount0: burn.amount0,
                amount1: burn.amount1,
                amountUSD: burn.amountUSD,
                token0Symbol: burn.pool.token0.symbol,
                token1Symbol: burn.pool.token1.symbol,
                type: 'remove'
            }));
            transactions.push(...burnTransactions);
        }
    
        const sortedTransactions = transactions.sort(
            (a, b) => b.timestamp - a.timestamp
        );
        return sortedTransactions.slice(0, limit);
    } catch (error) {
        console.error(
            `Error fetching transactions for pool ${poolAddress}:`,
            error
        );
        throw new Error(
            `Failed to fetch pool transactions: ${
            error instanceof Error ? error.message : String(error)
            }`
        );
    }
};

export const fetchUniswapPoolsFees = async (poolAddress : string, timestamp : number) => {
    const startOfHour = Math.floor(timestamp / 3600) * 3600;
    console.log('startOfHour:', startOfHour);

    try {
        const query = `
            query {
                poolHourDatas(
                    first: 1,
                    orderBy: periodStartUnix,
                    orderDirection: asc,
                    where: {
                        pool: "${poolAddress.toLowerCase()}",
                        periodStartUnix_gte: ${startOfHour},
                        periodStartUnix_lt: ${startOfHour + 3600}
                    }
                ) {
                    periodStartUnix
                    feesUSD
                    volumeUSD
                    liquidity
                }
            }
        `;

        const response = await fetch('/api/uniswap-pools', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
        });

        if (!response.ok) {
            throw new Error(`Network error with status ${response.status}`);
        }

        const result = await response.json();

        if (!result?.data) {
            throw new Error('No data returned from Uniswap TheGraph API');
        }

        return result.data.poolHourDatas;
    } catch (error) {
        console.error(
            `Error fetching fees for pool ${poolAddress}:`,
            error
        );
        throw new Error(
            `Failed to fetch pool fees: ${error instanceof Error ? error.message : String(error)}`
        );
    }
};

export async function fetchCurvePools(): Promise<CurvePoolData[]> {
    try {
        const poolUrl = 'https://api.curve.fi/v1/getPools/all/ethereum';
        const volumesUrl = 'https://api.curve.fi/v1/getVolumes/ethereum';
        
        const [poolResponse, volumesResponse] = await Promise.all([
            fetch(poolUrl),
            fetch(volumesUrl)
        ]);
        
        if (!poolResponse.ok) {
            throw new Error(`Failed to fetch Curve pools: ${poolResponse.statusText}`);
        }
        if (!volumesResponse.ok) {
            throw new Error(`Failed to fetch Curve volumes: ${volumesResponse.statusText}`);
        }
    
        const poolDataJson = await poolResponse.json();
        if (!poolDataJson?.data?.poolData) {
            throw new Error('Invalid Curve API response format for pools');
        }
        const volumesDataJson = await volumesResponse.json();
        if (!volumesDataJson?.data) {
            throw new Error('Invalid Curve API response format for volumes');
        }
    
        const volumesMap = new Map<string, number>();
        const apyDailyMap = new Map<string, number>();
        const apyWeeklyMap = new Map<string, number>();
    
        const poolsVolumeData = volumesDataJson.data.pools || [];
        for (const poolObj of poolsVolumeData) {
            if (poolObj?.address) {
                const addr = poolObj.address.toLowerCase();
                if (poolObj.volumeUSD) {
                    volumesMap.set(addr, parseFloat(poolObj.volumeUSD));
                }
                if (poolObj.latestDailyApyPcent) {
                    apyDailyMap.set(addr, parseFloat(poolObj.latestDailyApyPcent));
                }
                if (poolObj.latestWeeklyApyPcent) {
                    apyWeeklyMap.set(addr, parseFloat(poolObj.latestWeeklyApyPcent));
                }
            }
        }
        
        const curvePools: CurvePoolData[] = [];
        const pyusdLower = PYUSD_ADDRESS.toLowerCase();
    
        for (const poolData of poolDataJson.data.poolData) {
            if (!poolData.coins || !Array.isArray(poolData.coins)) continue;
    
            const hasPYUSD = poolData.coins.some((coin: any) =>
                coin.address.toLowerCase() === pyusdLower
            );
            if (!hasPYUSD) continue;
    
            const tokens = poolData.coins.map((coin: any, i: number) => ({
                address: coin.address,
                symbol: coin.symbol,
                decimals: coin.decimals,
                name: coin.name || coin.symbol,
                token_index: i
            }));
    
            const reserves = poolData.coins.map((coin: any) => {
                const balance = parseFloat(coin.poolBalance || '0');
                const decimals = parseInt(coin.decimals) || 0;
                return balance / 10 ** decimals;
            });
    
            const poolLower = poolData.address.toLowerCase();
            const volume24hValue = volumesMap.get(poolLower) ?? 0;
            const apyDaily = apyDailyMap.get(poolLower) ?? 0;
            const apyWeekly = apyWeeklyMap.get(poolLower) ?? 0;
    
            let fees = 0;
            let liquidityData = undefined;
            const tvlUsd = parseFloat(poolData.usdTotal || '0');
            if (tvlUsd !== 0) { 
                fees = await calculateCurveFees(poolData.address);
                liquidityData = await fetchCurveLiquidityData(tokens, poolData.address);
            }
    
            let formattedVirtualPrice = 0;
            try {
                const rawVirtualPrice = ethers.toBigInt(poolData.virtualPrice || '0');
                formattedVirtualPrice = parseFloat(ethers.formatUnits(rawVirtualPrice, 18));
            } catch (error) {
                console.error('Error parsing virtualPrice for pool', poolData.address, error);
            }

            const swap = await fetchAndSimplifyCurveTrades(poolData.address, tokens[0].address, tokens[1].address);
    
            const poolInfo: CurvePoolData = {
                id: poolData.address,
                name: poolData.name,
                address: poolData.address,
                type: 'curve',
                tokens,
                tvl: tvlUsd,
                volume24h: volume24hValue,
                apy: apyDaily,
                apyWeekly: apyWeekly,
                fees24h: fees,
                createdAt: poolData.creationTs || (Math.floor(Date.now() / 1000) - 86400 * 30),
                virtualPrice: formattedVirtualPrice,
                amplificationCoefficient: parseFloat(poolData.amplificationCoefficient || '0'),
                reserves,
                curveSwaps: swap,
                curveLiquidity: liquidityData
            };
    
            curvePools.push(poolInfo);
        }
        
        return curvePools.sort((a, b) => b.tvl - a.tvl);
    } catch (error) {
        console.error('Error fetching Curve pools:', error);
        return [];
    }
};

export async function fetchAndSimplifyCurveTrades(poolAddress: string, mainToken: string, referenceToken: string): Promise<SimplifiedTrade[]> {
    const url =
        `https://prices.curve.fi/v1/trades/ethereum/${poolAddress}?main_token=${mainToken}&reference_token=${referenceToken}&page=1&per_page=20&include_state=false`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
    
        const data: CurveTradesResponse = await response.json();
    
        const { main_token, reference_token, data: trades } = data;
    
        const simplifiedTrades: SimplifiedTrade[] = trades.map((trade) => {
            let fromToken: TokenInfo, toToken: TokenInfo;
            let fromAmount: number, toAmount: number;
    
            if (main_token.pool_index === trade.sold_id) {
                fromToken = main_token;
                toToken = reference_token;
                fromAmount = trade.tokens_sold;
                toAmount = trade.tokens_bought;
            } else if (reference_token.pool_index === trade.sold_id) {
                fromToken = reference_token;
                toToken = main_token;
                fromAmount = trade.tokens_sold;
                toAmount = trade.tokens_bought;
            } else {
                fromToken = main_token;
                toToken = reference_token;
                fromAmount = trade.tokens_sold;
                toAmount = trade.tokens_bought;
            }
    
            return {
                ...trade,
                fromToken,
                toToken,
                fromAmount,
                toAmount,
            };
        });
    
        return simplifiedTrades;
    } catch (error) {
        console.error("Error fetching curve trades:", error);
        throw error;
    }
};

async function fetchCurveLiquidityData(token: any, poolAddress: string): Promise<CurveLiquidityResponse> {
    const url = `https://prices.curve.fi/v1/liquidity/ethereum/${poolAddress}?page=1&per_page=20&include_state=false`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const rawData = await response.json();

        const events: LiquidityEvent[] = rawData.data.map((rawEvent: any) => {
            const tokensData: LiquidityTokenData[] = rawEvent.token_amounts
            .map((amount: number, index: number) => {
                const matchingToken = token.find((t: any) => t.token_index === index && amount !== 0);
                return matchingToken
                ? {
                    tokenIndex: index,
                    amount,
                    tokenInfo: matchingToken,
                    }
                : null;
            })
            .filter((entry: LiquidityTokenData | null) => entry !== null) as LiquidityTokenData[];
            
            return {
                eventType: rawEvent.liquidity_event_type,
                blockNumber: rawEvent.block_number,
                time: rawEvent.time,
                transactionHash: rawEvent.transaction_hash,
                provider: rawEvent.provider,
                tokensData,
            };
        });
    
        const result: CurveLiquidityResponse = {
            chain: rawData.chain,
            address: rawData.address,
            events,
        };
    
        return result;
    } catch (error) {
        console.error("Error fetching Curve liquidity data:", error);
        throw error;
    }
};

// Helper function to calculate Curve fees
async function calculateCurveFees(poolAddress: string): Promise<number> {
    try {
        const url = `https://prices.curve.fi/v1/pools/ethereum/${poolAddress}`;
        const response = await fetch(url, {
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch Curve Fees: ${response.statusText}`);
        }
        
        const json = await response.json();
        
        if (json?.data && typeof json.data.trading_fee_24h !== 'undefined') {
            return parseFloat(json.data.trading_fee_24h);
        } else if (typeof json.trading_fee_24h !== 'undefined') {
            return parseFloat(json.trading_fee_24h);
        } else {
            console.error('Unexpected fees JSON:', json);
            throw new Error('Invalid Curve API response format for fees');
        }
    } catch (error) {
        console.error('Error fetching Curve Fees:', error);
        return 0;
    }
};

// Calculate estimated APY for Uniswap pools
function calculateUniswapAPY(tvl: number, volume24h: number, feeTier: number): number {
    if (tvl === 0) return 0;
    const dailyFees = volume24h * feeTier;
    const yearlyFees = dailyFees * 365;
    return (yearlyFees / tvl) * 100;
};

// Main function to fetch all pool data
export async function fetchAllPools(): Promise<PoolData[]> {
    try {
        const [uniswapPools, curvePools] = await Promise.all([
            fetchUniswapPools(),
            fetchCurvePools()
        ]);
        
        // Combine all pools and sort by TVL
        return [...uniswapPools, ...curvePools].sort((a, b) => b.tvl - a.tvl);
    } catch (error) {
        console.error('Error fetching all pools:', error);
        throw new Error(`Failed to fetch pool data: ${error instanceof Error ? error.message : String(error)}`);
    }
};