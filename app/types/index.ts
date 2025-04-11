/* eslint-disable @typescript-eslint/no-explicit-any */
export const METHOD_SIGNATURES: Record<string, string> = {
    '0xa9059cbb': 'transfer',
    '0x095ea7b3': 'approve',
    '0x23b872dd': 'transferFrom',
    '0x70a08231': 'balanceOf',
    '0x18160ddd': 'totalSupply',
    '0xdd62ed3e': 'allowance',
    '0x313ce567': 'decimals',
    '0x06fdde03': 'name',
    '0x95d89b41': 'symbol',
    '0x7ff36ab5': 'swapExactETHForTokens',
    '0x38ed1739': 'swapExactTokensForTokens',
    '0x022c0d9f': 'swap',
    '0x1a98b2e0': 'executeWithToken',
    '0x5c9c18e2': 'exchange',
    '0xac9650d8': 'multicall',
    '0x8dae1a80': 'remove_liquidity',
    '0x73fc4457': 'swapWithMagpieSignature',
    '0xf41b2db6': 'executeOrder',
    '0xc7c7f5b3': 'send',
    '0x13d79a0b': 'MoooZ1089603480',
    '0x1f17c083': 'decreaseSupplyFromAddress',
    '0xad180c4e': 'swapSettle',
};

export const PYUSD_ABI = [
    "event Transfer(address indexed from, address indexed to, uint256 value)",
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
    "function name() view returns (string)",
    "function transfer(address to, uint256 amount) external returns (bool)",
    "function transferFrom(address sender, address recipient, uint256 amount) returns (bool)",
    'function totalSupply() view returns (uint256)',
];

export const knownEventFieldNames: Record<string, Record<string, string[]>> = {
    // Key: Event name
    // Value: Object where keys are fingerprints of param types and values are field names
    "Transfer": {
        "address,address,uint256": ["from", "to", "value"]
    },
    "Approval": {
        "address,address,uint256": ["owner", "spender", "value"],
        "address,address,address,uint160,uint48": ["owner", "token", "spender", "amount", "expiration"]
    },
    "Deposit": {
        "address,uint256": ["dst", "wad"],
        "address,uint256,uint256": ["user", "amount", "timestamp"],
        "address,address,uint256,uint256": ["caller", "owner", "assets", "shares"],
        "address,address,address,uint256,uint256": ["sender", "receiver", "owner", "assets", "shares"]
    },
    "Withdraw": {
        "uint256": ["tvl"],
        "address,uint256": ["provider", "value"],
        "address,uint256,uint256": ["provider", "amountBorrowed", "amountCollateral"],
        "address,address,address,uint256,uint256": ["sender", "receiver", "owner", "assets", "shares"],
    },
    "Withdrawal": {
        "address,uint256": ["src", "wad"],
    },
    "Withdrawn": {
        "address,uint256,uint256": ["user", "poolid", "amount"],
    },
    "Swap": {
        "address,uint256,uint256,uint256,uint256,address": ["sender", "amount0In", "amount1In", "amount0Out", "amount1Out", "to", "feeInPrecision"],
        "address,uint256,uint256,uint256,uint256,address,uint256": ["sender", "amount0In", "amount1In", "amount0Out", "amount1Out"],
        "address,address,int256,int256,uint160,uint128,int24": ["sender", "recipient", "amount0", "amount1", "sqrtPriceX96", "liquidity", "tick"],
        "address,address,int256,int256,uint160,uint128": ["sender", "recipient", "amount0", "amount1", "sqrtPriceX96", "liquidity"],
        "address,address,int256,int256,uint160,uint128,int24,uint256": ["sender", "recipient", "amount0", "amount1", "sqrtPriceX96", "liquidity", "tick", "timestamp"],
        "address,address,int256,int256,uint160,uint128,int24,uint128,uint128": ["sender", "recipient", "amount0", "amount1", "sqrtPriceX96", "liquidity", "tick", "protocolFeesToken0", "protocolFeesToken1"],
        "address,address,address,uint256,uint256,uint256,uint256": ["pool", "tokenIn", "tokenOut", "amountIn", "amountOut", "swapFeePercentage", "swapFeeAmount"],
        "address,uint256,uint256": ["user", "amountIn", "amountOut"],
        "address,uint256,address,uint256,address,int256,uint32": ["sender", "inputAmount", "inputToken", "amountOut", "outputToken", "slippage", "referralCode"],
        "address,address,uint256,uint256": ["sender", "recipient", "amountIn", "amountOut"],
        "bool,uint256,uint256,address": ["status", "amountIn", "amountOut", "to"],
        "bytes32,address,address,uint256,uint256": ["poolId", "tokenIn", "tokenOut", "amountIn", "amountOut"],
        "bytes32,address,int128,int128,uint160,uint128,int24,uint24": ["id", "sender", "amount0", "amount1", "sqrtPriceX96", "liquidity", "tick", "fee"],
        "string,address": ["aggregatorId", "sender"]
    },
    "Swapped": {
        "address,address,address,address,uint256,uint256": ["sender", "srcToken", "dstToken", "dstReceiver", "spentAmount", "returnAmount"]
    },
    "SwapAndIncreaseLiquidity": {
        "address,uint256,uint128,uint256,uint256": ["nfpm", "tokenId", "liquidity", "amount0", "amount1"],
    },
    "SwapFeePercentageChanged": {
        "uint256": ["swapFeePercentage"],
    },
    "Stake": {
        "address,address,uint256":["caller", "receipient", "amount"],
    },
    "AddLiquidity": {
        "address,uint256[],uint256": ["provider", "tokenAmounts", "lpTokenMinted"],
        "address,uint256[],uint256,uint256": ["provider", "tokenAmounts", "minMintAmount", "deadline"],
        "address,uint256[3],uint256[3],uint256,uint256": ["provider", "tokenAmounts", "fees", "invariant", "tokenSupply"],
        "address,uint256,uint256,uint256,uint256,address": ["sender", "amount0", "amount1", "liquidity", "timestamp", "to"],
        "address,uint256[],uint256[],uint256,uint256": ["provider", "tokenAmounts", "fees", "invariant", "tokenSupply"],
        "address,uint256[2],uint256[2],uint256,uint256": ["provider", "tokenAmounts", "fees", "invariant", "tokenSupply"],
    },
    "Bought" : {
        "address,address,uint256,uint256": ["fromAsset", "toAsset", "amountSold", "receivedAmount"],
    },
    "BebopOrder": {
        "uint128": ["eventId"],
    },
    "BKBridge": {
        "uint256,bytes32,address,address,address,address,address,uint256,uint256,uint256,uint256": ["orderStatus", "transferId", "vaultReceiver", "sender", "receiver", "srcToken", "dstToken", "srcChainId", "dstChainId", "amount", "timestamp"],
    },
    "CallWithContext": {
        "address,bytes19,address,address,bytes4": ["caller", "onBehalfOfAddressPrefix", "onBehalfOfAccount", "targetContract", "selector"],
    },
    "ClaimAdminFee": {
        "address,uint256": ["admin", "tokens"],
    },
    "clientData": {
        "bytes": ["clientData"],
    },
    "Collect": {
        "address,address,int24,int24,uint128,uint128": ["owner", "recipient", "tickLower", "tickUpper", "amount0", "amount1"],
        "uint256,address,uint256,uint256": ["tokenId", "recipient", "amount0", "amount1"],
    },
    "DaiToUsds": {
        "address,address,uint256": ["caller", "usr", "wad"],
    },
    "DecreaseLiquidity": {
        "uint256,uint128,uint256,uint256": ["tokenId", "liquidity", "amount0", "amount1"],
    },
    "DeductFees": {
        "address,uint256,address,(address,address,address,uint256,uint256,uint256,uint256,uint256,uint256,uint64,uint8)": ["nfpm", "tokenId", "userAddress", "data"],
    },
    "EthPurchase": {
        "address,uint256,uint256": ["buyer", "tokensSold", "ethBought"],
    },
    "Exchange": {
        "address,uint256,address": ["pair", "amountOut", "output"],
        "address,address,address[11],uint256[5][5],address[5],uint256,uint256": ["sender", "receiver", "route", "swapParams", "pools", "amountIn", "amountOut"],
    },
    "Exit": {
        "address,address,uint256": ["caller", "usr", "wad"],
    },
    "Fee": {
        "address,uint256,uint256,address[],uint256[],bool": ["token", "totalAmount", "totalFee", "recipients", "amounts", "isBps"],
    },
    "FeesCollected": {
        "address,address,uint256,uint256": ["token", "integrator", "integratorFee", "lifiFee"],
    },
    "FlashLoan": {
        "address,address,uint256,uint256": ["recipient", "token", "amount", "feeAmount"],
        "address,address,uint256,uint256,bytes": ["recipient", "token", "amount", "feeAmount", "data"],
    },
    "FulfilledOrder": {
        "((address,uint256)[],(address,uint256)[],(address,uint256,bytes),address,address),address,address": ["order", "caller", "recipient"],
    },
    "IncreaseLiquidity": {
        "uint256,uint128,uint256,uint256": ["tokenId", "liquidity", "amount0", "amount1"],
    },
    "Join": {
        "address,address,uint256": ["caller", "usr", "wad"],
    },
    "LOG_SWAP": {
        "address,address,address,uint256,uint256": ["caller", "tokenIn", "tokenOut", "tokenAmountIn", "tokenAmountOut"],
    },
    "Migrated": {
        "address,address,address,uint256,uint256": ["user", "oldToken", "newToken", "oldAmount", "newAmount"],
    },
    "OrderFilled": {
        "bytes32,uint256": ["orderHash", "remainingAmount"],
    },
    "RemoveLiquidity": {
        "address,uint256,uint256[]": ["provider", "lpTokenAmount", "minAmounts"],
        "address,uint256,uint256[],uint256": ["provider", "lpTokenAmount", "minAmounts", "deadline"],
        "address,uint256,uint256[],uint256,uint256": ["provider", "lpTokenAmount", "minAmounts", "deadline", "timestamp"],
        "address,uint256[],uint256[],uint256": ["provider", "tokenAmounts", "fees", "tokenSupply"],
    },
    "RemoveLiquidityOne": {
        "address,uint256,uint256,uint256[]": ["provider", "lpTokenAmount", "tokenIndex", "minAmount"],
        "address,int128,uint256,uint256,uint256": ["provider", "tokenId", "tokenAmount", "coinAmount", "tokenSupply"],
        "address,uint256,uint256,uint256": ["provider", "tokenAmount", "coinAmount", "tokenSupply"],
        "address,uint256,uint256": ["provider", "tokenAmount", "coinAmount"],
    },
    "RemoveLiquidityImbalance": {
        "address,uint256[],uint256[],uint256,uint256": ["provider", "tokenAmounts", "fees", "invariant", "tokenSupply"],
    },
    "Repay": {
        "address,uint256,uint256,uint256,uint256,uint256,uint256": ["user", "stateCollateralUsed", "borrowedFromStateCollateral", "userCollateral", "userCollateralUsed", "borrowedFromUserCollateral", "userBorrowed"],
        "address,uint256,uint256": ["user", "collateralDecrease", "loanDecrease"]
    },
    "RewardPaid": {
        "address,uint256": ["user", "reward"],
    },
    "TokenExchange": {
        "address,int128,uint256,int128,uint256": ["buyer", "soldId", "tokensSold", "boughtId", "tokensBought"],
        "address,uint256,uint256,uint256,uint256": ["buyer", "soldId", "tokensSold", "boughtId", "tokensBought"],
        "address,uint256,uint256,uint256,uint256,uint256,uint256": ["buyer", "soldId", "tokensSold", "boughtId", "tokensBought", "fees", "packedPriceScale"],
    },
    "TokenExchangeUnderlying": {
        "address,int128,uint256,int128,uint256": ["buyer", "soldId", "tokensSold", "boughtId", "tokensBought"],
        "address,uint256,uint256,uint256,uint256": ["buyer", "soldId", "tokensSold", "boughtId", "tokensBought"]
    },
    "TokenReturned": {
        "address,uint256": ["token", "amount"],
    },
    "TokensClaimed": {
        "address,uint256": ["pool", "cncAmount"],
    },
    "TransitSwapped": {
        "address,address,address,uint256,uint256,uint256,string": ["srcToken", "dstToken", "dstReceiver", "amount", "returnAmount", "toChainID", "channel"],
    },
    "UpdateEMA": {
        "uint256,uint256,uint128,uint256": ["shortEMA", "longEMA", "lastBlockVolume", "skipBlock"],
    },
    "UserState": {
        "address,uint256,uint256,int256,int256,uint256": ["user", "collateral", "debt", "n1", "n2", "liquidationDiscount"],
        "address,uint256,uint256,int256,int256,uint256,uint256": ["user", "collateral", "debt", "n1", "n2", "liquidationDiscount", "timestamp"]
    },
    "UsdsToDai": {
        "address,address,uint256": ["caller", "usr", "wad"],
    },
    "UpdateLiquidityLimit": {
        "address,uint256,uint256,uint256,uint256": ["user", "originalBalance", "originalSupply", "workingBalance", "workingSupply"],
    },
    "Mint": {
        "address,uint256,uint256": ["minter", "tokenId", "amount"],
        "address,address,uint256": ["operator", "to", "tokenId"],
        "address,address,uint256,uint256": ["operator", "to", "tokenId", "amount"],
        "address,address,uint256,uint256,bytes": ["operator", "to", "tokenId", "amount", "data"],
        "address,address,uint256,uint256,uint256": ["to", "operator", "amount", "tokenId", "fees"],
        "address,address,int24,int24,uint128,uint256,uint256": ["sender", "owner", "tickLower", "tickUpper", "amount", "amount0", "amount1"],
    },
    "Burn": {
        "address,uint256": ["tokenId", "amount"],
        "address,address,uint256": ["operator", "from", "tokenId"],
        "address,address,uint256,uint256": ["operator", "from", "tokenId", "amount"],
        "address,address,uint256,uint256,uint256": ["operator", "from", "amount", "tokenId", "fees"],
        "address,address,uint256,uitn256,uint256": ["operator", "from", "amount", "tokenId", "fees"],
        "address,address,uint256,uint256,bytes": ["operator", "from", "tokenId", "amount", "data"],
        "address,int24,int24,uint128,uint256,uint256": ["owner", "tickLower", "tickUpper", "amount", "amount0", "amount1"]
    },
    "PointsCorrectionUpdated": {
        "address,int256": ["account", "pointsCorrection"],
    },
    "PriceUpdate": {
        "uint256,uint256": ["oldPrice", "newPrice"],
        "address,uint256,uint256": ["token", "oldPrice", "newPrice"]
    },
    "Trade": {
        "address,address,uint256,uint256": ["trader", "subject", "buyAmount", "sellAmount"],
        "address,address,address,uint256,uint256,uint256,bytes": ["owner", "sellToken", "buyToken", "sellAmount", "buyAmount", "feeAmount", "orderUid"]
    },
    "Interaction": {
        "address,uint256,bytes4": ["target", "value", "selector"],
    },
    "Settlement": {
        "address": ["solver"]
    },
    "SetRate": {
        "uint256,uint256,uint256": ["rate", "rateMul", "time"],
    },
    "SellGem": {
        "address,uint256,uint256": ["owner", "value", "fee"],
    },
    "Sync": {
        "uint112,uint112": ["reserve0", "reserve1"],
        "uint256,uint256,uint256,uint256": ["vReserve0", "vReserve0", "reserve0", "reserve1"],
    },
    "ReserveDataUpdated": {
        "address,uint256,uint256,uint256,uint256,uint256": ["asset", "liquidityRate", "stableBorrowRate", "variableBorrowRate", "liquidityIndex", "variableBorrowIndex"]
    },
    "Wrap": {
        "address,uint256,uint256,bytes32": ["wrappedToken", "depositedUnderlying", "mintedShares", "bufferBalances"],
    },
    "Unwrap": {
        "address,uint256,uint256,bytes32": ["wrappedToken", "burnedShares", "withdrawnUnderlying", "bufferBalances"],
    },
    "DODOSwap": {
        "address,address,uint256,uint256,address,address": ["fromToken", "toToken", "fromAmount", "toAmount", "trader", "receiver"]
    },
    "VaultStatusCheck": {
        "address": ["vault"],
    },
    "WithdrawAndCollectAndSwap": {
        "address,uint256,address,uint256": ["nfpm", "tokenId", "token", "amount"],
    },
};

// Additional known context-specific field names by parameter type
export const typeBasedFieldNames: Record<string, string> = {
    "address": "account",
    "address[]": "accounts",
    "uint256": "amount",
    "uint256[]": "amounts",
    "int256": "amount",
    "int256[]": "amounts",
    "bool": "status",
    "string": "name",
    "bytes": "data",
    "bytes32": "hash",
    "uint8": "decimals",
    "uint16": "feeBps",
    "uint32": "timestamp",
    "uint64": "timestamp",
    "uint128": "liquidity",
    "uint160": "sqrtPrice",
    "int24": "tick",
    "int128": "tokenId",
    "uint256[][]": "nestedAmounts"
};

export const NUMERIC_FORMAT_KEYS = new Set([
    'value', 'sold id', 'bought id', 'amount', 'amount0', 'amount1', 'amount2', 'integrator',
    'amount3', 'amount4', 'amount5', 'liquidity', 'sqrt price x96', 'tick lower', 'integrator fee',
    'tick', 'tokens sold', 'tokens bought', 'amount', 'amounts1', 'tick upper', 'lifi fee', 'eth bought',
    'amounts0', 'token supply', 'coin amount', 'token amount', 'reserve0', 'reserve1', 'to chain i d',
    'token id', 'invariant', 'status', 'amount in', 'amount out', 'remaining amount', 'channel',
    'spent amount', 'return amount', 'sell amount', 'buy amount', 'tvl', 'tokens', 'total amount',
    'fee amount', 'selector', 'expiration', 'stable borrow rate', 'poolid', 'fee', 'total fee', 'is bps',
    'variable borrow rate', 'stable rate', 'liquidity rate', 'cnc amount', 'event id', 'provider',
    'liquidity index', 'variable borrow index', 'fee bps', 'aggregator id', 'fee in precision',
    'swap fee percentage', 'swap fee amount', 'from amount', 'to amount', 'order status', 'transfer id',
    'packed price scale', 'input amount', 'slippage', 'referral code', 'vault receiver', 'src chain id',
    'amount borrowed', 'amount collateral', 'collateral', 'debt', 'n1', 'n2', 'dst chain id',
    'liquidation discount', 'collateral decrease', 'loan decrease', 'rate', 'timestamp', 'old amount',
    'rate mul', 'time', 'data', 'client data', 'buffer balances', 'output', 'protocol fees token0',
    'deposited underlying', 'minted shares', 'assets', 'shares', 'burned shares', 'protocol fees token1',
    'withdrawn underlying', 'wad', 'amount sold', 'received amount', 'decimals', 'new amount',
    'amount0 in', 'amount0 out', 'amount1 in', 'amount1 out', 'amount2 in', 'amount2 out',
    'original balance', 'original supply', 'working balance', 'working supply', 'points correction',
    'short e m a', 'long e m a', 'last block volume', 'skip block', 'token amount in', 'token amount out',
]);

export interface Transaction {
    hash: string;
    from: string;
    to: string;
    value: string;
    gasUsed: string;
    gasPrice: string;
    timestamp: number;
    status: 'success' | 'failed';
    method?: string;
    input?: string;
    blockNumber: number;
    gasLimit: string;
    nonce: number;
    transactionIndex: number;
};

export interface InternalTransaction {
    from: string;
    to: string;
    value: string;
    gasLimit: string;
    callType: string;
    input: string;
    output: string;
    depth: number;
};

export interface Token {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    logoURI?: string;
};

export interface DecodedEventLog {
    address: string;
    topics: string[];
    data: string;
    eventType: string;
    decoded: any;
};

export interface EventParam {
    name: string;
    type: string;
    value: any;
};

export interface FormattedEventData {
    [key: string]: any;
    tokenAddress?: string;
};

export interface DecodedLog {
    address: string;
    eventType: string;
    eventSignature?: string;
    rawTopics: readonly string[];
    rawData: string;
    formattedData: FormattedEventData | null;
};

export interface TransactionFlow {
    id: string;
    hash: string;
    summary: string;
    transactions: Transaction[];
    internalTransactions?: InternalTransaction[];
    tokens: Token[];
    eventLogs?: DecodedEventLog[];
    decodedAllEventLogs?: DecodedEventLog[];
    totalValue: string;
    gasCost?: string;
    timestamp: number;
    blockNumber: number;
    contractInteractions?: boolean;
};

export interface ContractInfo {
    address: string;
    isContract: boolean;
    name: string | null;
    isToken: boolean;
    bytecode: string;
};

export interface BlockDetails {
    number: number;
    hash: string;
    timestamp: number;
    miner: string;
    gasUsed: string;
    gasLimit: string;
    baseFeePerGas?: string;
    transactionCount: number;
};

export interface TransactionSummary {
    hash: string;
    from: string;
    to: string;
    value: string;
    timestamp: number;
    status: 'success' | 'failed';
};

export interface TransactionData {
    hash: string;
    from: string;
    to: string;
    value: string;
    timestamp: number;
    status: boolean;
    blockNumber: number;
    gas: number;
    gasPrice: number;
};

export interface Address {
    address: string;
    balance: string;
    transactionCount: number;
    isContract: boolean;
    name?: string;
    tokenBalances?: TokenBalance[];
};

export interface TokenBalance {
    token: Token;
    balance: string;
    valueUsd?: string;
};

export interface NetworkStats {
    latestBlock: number;
    gasPrice: string;
    transactions24h: number;
    activeAddresses24h: number;
};

export interface NetworkStatus {
    blockNumber: number;
    gasPrice: number;
    feeHistory: {
        baseFeePerGas: string;
        gasUsedRatio: number;
        oldestBlock: number;
        reward: string[];
    }[];
    pendingTxCount: number;
    queuedTxCount: number;
    estimatedGas: {
        low: number;
        average: number;
        fast: number;
    };
};

export type PoolType = 'uniswap' | 'curve';

export interface Token {
    address: string;
    symbol: string;
    decimals: number;
};

export interface PoolData {
    id: string;
    name: string;
    type: PoolType;
    address: string;
    tokens: Token[];
    tvl: number;
    volume24h: number;
    apr?: number;
    apy: number;
    apyWeekly?: number;
    fees24h: number;
    dailyData7d?: { timestamp: number; volumeUSD: number; feesUSD: number; }[];
    createdAt: number;
    reserves?: number[];
    weight?: number[];
    fee?: number;
    amplificationCoefficient?: number;
    transactions?: UniswapPoolTransaction[];
    curveSwaps?: SimplifiedTrade[];
    curveLiquidity?: CurveLiquidityResponse;
};

export interface UniswapPoolData extends PoolData {
    fee: number;
    tickSpacing: number;
    liquidity: string;
};

export interface CurvePoolData extends PoolData {
    virtualPrice: number;
    amplificationCoefficient: number;
};

export interface UniswapPoolTransaction {
    id: string;
    timestamp: number;
    sender: string;
    recipient: string;
    amount0: string;
    amount1: string;
    amountUSD: string;
    token0Symbol: string;
    token1Symbol: string;
    type: string;
};

export interface TokenInfo {
    symbol: string;
    address: string;
    pool_index: number;
    event_index: number;
};

interface Trade {
    sold_id: number;
    bought_id: number;
    tokens_sold: number;
    tokens_sold_usd: number;
    tokens_bought: number;
    tokens_bought_usd: number;
    price: number;
    block_number: number;
    time: string;
    transaction_hash: string;
    buyer: string;
    fee: number;
    usd_fee: number;
    pool_state: any;
};

export interface CurveTradesResponse {
    chain: string;
    address: string;
    main_token: TokenInfo;
    reference_token: TokenInfo;
    data: Trade[];
};

export interface SimplifiedTrade extends Trade {
    fromToken: TokenInfo;
    toToken: TokenInfo;
    fromAmount: number;
    toAmount: number;
};

export interface LiquidityTokenData {
    tokenIndex: number;
    amount: number;
    tokenInfo: {
        token_index: number;
        name: string;
        symbol: string;
    };
};

export interface LiquidityEvent {
    eventType: string;
    blockNumber: number;
    time: string;
    transactionHash: string;
    provider: string;
    tokensData: LiquidityTokenData[];
};

export interface CurveLiquidityResponse {
    chain: string;
    address: string;
    events: LiquidityEvent[];
};

export interface CryptoData {
    id: string;
    symbol: string;
    name: string;
    image: {
        thumb: string;
        small: string;
        large: string;
    };
    categories: string[];
    last_updated: string;
    market_cap_rank: number;
    description?: {
        en: string;
    };
    links?: {
        homepage: string[];
        twitter_screen_name?: string;
    };
    platforms?: Record<string, string>;
    market_data: {
        current_price: Record<string, number | undefined>;
        ath: Record<string, number | undefined>;
        atl: Record<string, number | undefined>;
        market_cap: Record<string, number | undefined>;
        total_volume: Record<string, number | undefined>;
        price_change_percentage_24h?: number;
        price_change_percentage_7d?: number;
        price_change_percentage_30d?: number;
        price_change_percentage_1y?: number;
        circulating_supply?: number;
        total_supply?: number;
    };
    tickers: Ticker[];
};

export interface Ticker {
    base: string;
    target: string;
    market: {
        name: string;
    };
    last: number;
    volume: number;
    trust_score?: string;
};

export interface PyusdTransactionStats {
    totalTransactions: number,
    avgTransactionsPerBlock: number,
    avgGasUsed: bigint,
    totalGasUsed: number,
    transactionCounts: { block: number, count: number, gasUsed: number }[],
    transactionTypes: Record<string, number>,
};