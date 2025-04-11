/* eslint-disable @typescript-eslint/no-explicit-any */
import { ethers } from 'ethers';
import axios from 'axios';
import {
    PYUSD_ABI,
    Token, 
    Transaction,
    knownEventFieldNames,
    typeBasedFieldNames,
    DecodedEventLog,
    DecodedLog,
    EventParam,
    FormattedEventData,
    TransactionFlow, 
    InternalTransaction, 
    NetworkStatus, 
    TransactionData, 
    METHOD_SIGNATURES,
    PyusdTransactionStats,
} from '../types';

const RPC_URL = process.env.NEXT_PUBLIC_GCP_RPC_URL;
const PYUSD_ADDRESS = process.env.NEXT_PUBLIC_PYUSD_CONTRACT_ADDRESS || '';
const ETHERSCAN_API_KEY = process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY;
const COINGECKO_API_KEY = process.env.NEXT_PUBLIC_COINGECKO_API_KEY;

export const provider = new ethers.JsonRpcProvider(RPC_URL);

const pyusdContract = new ethers.Contract(PYUSD_ADDRESS, PYUSD_ABI, provider);

export async function getTransaction(hash: string): Promise<Transaction> {
    try {
        const tx = await provider.getTransaction(hash);
        if (!tx) {
            throw new Error(`Transaction with hash ${hash} not found`);
        }

        const receipt = await provider.getTransactionReceipt(hash);
        const block = await provider.getBlock(tx?.blockNumber || 0);
        
        let methodName = undefined;
        if (tx?.data && tx?.data?.length >= 10) {
                const methodId = tx.data.substring(0, 10);
                methodName = METHOD_SIGNATURES[methodId ] || methodId;
        }

        return {
            hash: tx?.hash || '',
            from: tx?.from || '',
            to: tx?.to || '',
            value: ethers.formatEther(tx?.value || 0),
            gasUsed: receipt?.gasUsed.toString() || '',
            gasPrice: ethers.formatUnits(tx?.gasPrice || 0, 'gwei'),
            timestamp: block?.timestamp || 0,
            status: receipt?.status === 1 ? 'success' : 'failed',
            method: methodName,
            input: tx?.data,
            blockNumber: tx?.blockNumber || 0,
            gasLimit: tx?.gasLimit.toString() || '',
            nonce: tx?.nonce || 0,
            transactionIndex: tx?.index || 0
        };
    } catch (error) {
        console.error('Error fetching transaction:', error);
        throw new Error(`Failed to fetch transaction: ${error instanceof Error ? error.message : String(error)}`);
    }
};

const eventParsers: Record<string, (log: ethers.Log) => any> = {
    [ethers.id("Transfer(address,address,uint256)")]: (log) => {
        return {
            from: '0x' + log.topics[1].substring(26),
            to: '0x' + log.topics[2].substring(26),
            tokenAddress: log.address,
            value: log.data === "0x" ? "0" : ethers.toBigInt(log.data).toString()
        };
    },
    [ethers.id("Approval(address,address,uint256)")]: (log) => {
        return {
            owner: '0x' + log.topics[1].substring(26),
            spender: '0x' + log.topics[2].substring(26),
            tokenAddress: log.address,
            value: log.data === "0x" ? "0" : ethers.toBigInt(log.data).toString()
        };
    },
};

const eventSignatureCache: Record<string, string> = {};
const eventFieldNamesCache: Record<string, string[]> = {};

async function fetchEventSignature(eventSignatureHash: string): Promise<string | null> {
    if (eventSignatureCache[eventSignatureHash]) {
        return eventSignatureCache[eventSignatureHash];
    }

    try {
        const response = await fetch(
            `https://www.4byte.directory/api/v1/event-signatures/?format=json&hex_signature=${eventSignatureHash}`
        );
        const data = await response.json();
        if (data.count > 0) {
            const signature = data.results[0].text_signature;
            eventSignatureCache[eventSignatureHash] = signature;
            return signature;
        }
        return null;
    } catch (error) {
        console.error(`Failed to fetch signature for topic ${eventSignatureHash}:`, error);
        return null;
    }
};

function generateParamTypeFingerprint(paramTypes: string[]): string {
    return paramTypes.join(',');
};

async function getEventFieldNames(eventName: string, paramTypes: string[], eventSignatureHash?: string): Promise<string[]> {
    if (eventSignatureHash) {
        const fullSignature = await fetchEventSignature(eventSignatureHash);
        if (fullSignature) {
            if (eventFieldNamesCache[fullSignature]) {
                return eventFieldNamesCache[fullSignature];
            }
            
            const namedParams = parseNamedParameters(fullSignature);
            if (namedParams && namedParams.length === paramTypes.length) {
                eventFieldNamesCache[fullSignature] = namedParams;
                return namedParams;
            }
        }
    }
    
    const paramFingerprint = generateParamTypeFingerprint(paramTypes);
    
    if (knownEventFieldNames[eventName] && knownEventFieldNames[eventName][paramFingerprint]) {
        return knownEventFieldNames[eventName][paramFingerprint];
    }
    
    const smartNames = generateSmartFieldNames(eventName, paramTypes);
    
    return smartNames;
};

function parseNamedParameters(fullSignature: string): string[] | null {
    try {
        const paramSection = fullSignature.match(/\((.*)\)/)?.[1];
        if (!paramSection) return null;
        
        const params = [];
        let currentParam = "";
        let nestLevel = 0;
        
        for (let i = 0; i < paramSection.length; i++) {
            const char = paramSection[i];
            
            if (char === '(' || char === '[') {
                nestLevel++;
                currentParam += char;
            } else if (char === ')' || char === ']') {
                nestLevel--;
                currentParam += char;
            } else if (char === ',' && nestLevel === 0) {
                if (currentParam.trim()) {
                    params.push(currentParam.trim());
                }
                currentParam = "";
            } else {
                currentParam += char;
            }
        }
        
        if (currentParam.trim()) {
            params.push(currentParam.trim());
        }
        
        const paramNames = params.map(param => {
            const withoutIndexed = param.replace('indexed', '').trim();
            
            const parts = withoutIndexed.split(' ');
            if (parts.length > 1) {
                return parts[parts.length - 1];
            }
            return "";
        });
        
        if (paramNames.every(name => name === "")) {
            return null;
        }
        
        return paramNames;
    } catch (error) {
        console.error(`Failed to parse parameter names from ${fullSignature}:`, error);
        return null;
    }
};

function generateSmartFieldNames(eventName: string, paramTypes: string[]): string[] {
    const smartNames: string[] = [];
    
    for (let i = 0; i < paramTypes.length; i++) {
        const paramType = paramTypes[i];
        
        if (i === 0) {
            if (paramType === "address") {
                if (eventName.includes("Transfer") || eventName.includes("Send")) {
                    smartNames.push("from");
                } else if (eventName.includes("Receive")) {
                    smartNames.push("to");
                } else {
                    smartNames.push("user");
                }
                continue;
            }
        }
        
        if (i === 1 && paramTypes[0] === "address" && paramType === "address") {
            if (eventName.includes("Transfer") || eventName.includes("Send")) {
                smartNames.push("to");
            } else {
                smartNames.push("recipient");
            }
            continue;
        }
        
        if ((i === paramTypes.length - 1 || i === paramTypes.length - 2) && 
            (paramType.includes("uint") || paramType.includes("int"))) {
            if (eventName.includes("Transfer") || eventName.includes("Send") || 
                eventName.includes("Withdraw") || eventName.includes("Deposit")) {
                smartNames.push("amount");
                continue;
            }
        }
        
        if (typeBasedFieldNames[paramType]) {
            const baseName = typeBasedFieldNames[paramType];
            if (!smartNames.includes(baseName)) {
                smartNames.push(baseName);
            } else {
                let suffix = 1;
                let uniqueName = `${baseName}${suffix}`;
                while (smartNames.includes(uniqueName)) {
                    suffix++;
                    uniqueName = `${baseName}${suffix}`;
                }
                smartNames.push(uniqueName);
            }
            continue;
        }
        
        smartNames.push(`param${i}`);
    }
    
    return smartNames;
};

function parseParameterTypes(eventSignature: string): string[] {
    try {
        const paramSection = eventSignature.match(/\((.*)\)/)?.[1] || "";
        const paramTypes: string[] = [];
        
        let currentParam = "";
        let nestLevel = 0;
        
        for (let i = 0; i < paramSection.length; i++) {
            const char = paramSection[i];
            
            if (char === '(' || char === '[') {
                nestLevel++;
                currentParam += char;
            } else if (char === ')' || char === ']') {
                nestLevel--;
                currentParam += char;
            } else if (char === ',' && nestLevel === 0) {
                if (currentParam.trim()) {
                    const paramType = currentParam.trim().split(' ')[0].replace('indexed', '').trim();
                    paramTypes.push(paramType);
                }
                currentParam = "";
            } else {
                currentParam += char;
            }
        }
        
        if (currentParam.trim()) {
            const paramType = currentParam.trim().split(' ')[0].replace('indexed', '').trim();
            paramTypes.push(paramType);
        }
        
        return paramTypes;
    } catch (error) {
        console.error(`Failed to parse parameter types from ${eventSignature}:`, error);
        return [];
    }
};

export async function decodeAllEventLogs(logs: ethers.Log[]): Promise<DecodedLog[]> {
    const decodedLogs: DecodedLog[] = [];

    for (const log of logs) {
        const eventSignatureHash = log.topics[0];
        const eventSignature = await fetchEventSignature(eventSignatureHash);
        
        if (eventSignature) {
            const eventName = eventSignature.split("(")[0];
            
            const paramTypes = parseParameterTypes(eventSignature);
            
            const fieldNames = await getEventFieldNames(eventName, paramTypes, eventSignatureHash);
            
            const indexedCount = log.topics.length - 1;
            const indexedParams: EventParam[] = [];
            const nonIndexedTypes: string[] = [];
            
            for (let i = 0; i < paramTypes.length; i++) {
                if (i < indexedCount) {
                    const topicValue = log.topics[i + 1];
                    
                    let value;
                    try {
                        if (paramTypes[i].includes("address")) {
                            value = ethers.getAddress("0x" + topicValue.slice(26));
                        } else if (paramTypes[i].includes("uint") || paramTypes[i].includes("int")) {
                            value = ethers.getBigInt(topicValue);
                        } else {
                            value = topicValue;
                        }
                    } catch (error) {
                        value = topicValue;
                        console.error(`Failed to decode indexed parameter ${i} for event ${eventName}:`, error);
                    }
                    
                    indexedParams.push({
                        name: fieldNames[i] || `param${i}`,
                        type: paramTypes[i],
                        value: value
                    });
                } else {
                    nonIndexedTypes.push(paramTypes[i]);
                }
            }
            
            const decodedData = decodeLogData(nonIndexedTypes, log.data);
            const nonIndexedParams: EventParam[] = [];
            
            if (decodedData) {
                for (let i = 0; i < nonIndexedTypes.length; i++) {
                    const paramIndex = indexedCount + i;
                    nonIndexedParams.push({
                        name: fieldNames[paramIndex] || `param${paramIndex}`,
                        type: nonIndexedTypes[i],
                        value: decodedData[i]
                    });
                }
            }
            
            const formattedParams: FormattedEventData = {};
            
            indexedParams.forEach(param => {
                formattedParams[param.name] = param.value;
            });
            
            nonIndexedParams.forEach(param => {
                formattedParams[param.name] = param.value;
            });
            
            formattedParams.tokenAddress = log.address;
            
            const result: DecodedLog = {
                address: log.address,
                eventType: eventName,
                eventSignature: eventSignature,
                rawTopics: log.topics,
                rawData: log.data,
                formattedData: formattedParams
            };
            
            decodedLogs.push(result);
        } else {
            decodedLogs.push({
                address: log.address,
                eventType: "Unknown",
                rawTopics: log.topics,
                rawData: log.data,
                formattedData: null
            });
        }
    }
    
    return decodedLogs;
};

const coder = new ethers.AbiCoder();

function decodeLogData(types: string[], data: string) {
    try {
        if (types.length === 0) return [];

        const expectedLength = types.length * 32;
        const actualLength = ethers.getBytes(data).length;
        if (actualLength < expectedLength) {
            console.warn(
                `Data is too short to decode. Needed: ${expectedLength} bytes, available: ${actualLength}`
            );
            return null;
        }
        return coder.decode(types, data);
    } catch (err) {
        console.warn("Failed to decode log data:", err);
        return null;
    }
};

function adaptDecodedLogs(logs: any[]): DecodedEventLog[] {
    return logs.map(log => ({
        address: log.address,
        topics: [...log.rawTopics],
        data: log.rawData,
        eventType: log.eventType,
        decoded: log.formattedData
    }));
};

export function decodeEventLogs(logs: ethers.Log[]) {
    return logs.map(log => {
        const eventSignature = log.topics[0];

        const parser = eventParsers[eventSignature];
        const decoded = parser ? parser(log) : null;

        const eventType =
            eventSignature === ethers.id("Transfer(address,address,uint256)")
                ? "ERC20 Transfer"
                : eventSignature === ethers.id("Approval(address,address,uint256)")
                ? "ERC20 Approval"
                : "Unknown";

        return {
            address: log.address,
            topics: log.topics,
            data: log.data,
            eventType,
            decoded
        };
    });
};

function extractInternalTransactions(traces: any): InternalTransaction[] {
    const internalTxs: InternalTransaction[] = [];

    if (traces.type && ["CALL", "STATICCALL", "DELEGATECALL", "CREATE", "CREATE2"].includes(traces.type)) {

        const isEthTransfer = traces.calls.find((call: any) => call.input === "0x");

        if (isEthTransfer) {
            const tx: InternalTransaction = {
                from: isEthTransfer.from || "",
                to: isEthTransfer.to || isEthTransfer.address || "",
                value: ethers.formatEther(BigInt(isEthTransfer.value)),
                gasLimit: isEthTransfer.gas ? isEthTransfer.gas.toString() : "0",
                callType: isEthTransfer.type,
                input: isEthTransfer.input || "",
                output: isEthTransfer.output || "",
                depth: isEthTransfer.depth || 0
            };
            internalTxs.push(tx);
        }
    }

    return internalTxs;
};

async function getTokenData(tokenAddress: string): Promise<Token | null> {
    try {
        const tokenContract = new ethers.Contract(
            tokenAddress,
            [
                'function name() view returns (string)',
                'function symbol() view returns (string)',
                'function decimals() view returns (uint8)'
            ],
            provider
        );
    
        const [name, symbol, decimals] = await Promise.all([
            tokenContract.name(),
            tokenContract.symbol(),
            tokenContract.decimals(),
        ]);

        const logoURI = `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${tokenAddress}/logo.png`;
    
        return {
            address: tokenAddress,
            name,
            symbol,
            decimals,
            logoURI
        };
    } catch (error) {
        console.error(`Error fetching token details for ${tokenAddress}:`, error);
        return null;
    }
};

export async function checkImageURL(url: string): Promise<string> {
    let logoURI = url;
    try {
        const response = await fetch(url, { method: 'HEAD' });
        if (!response.ok) {
            logoURI = '/empty-token.png';
            return logoURI;
        }
    } catch (fetchError) {
        console.error(`Error checking logo:`, fetchError);
        logoURI = '/empty-token.png';
        return logoURI;
    }

    return logoURI;
};

export async function getTransactionFlow(hash: string): Promise<TransactionFlow> {
    try {
        const mainTx = await getTransaction(hash);
        const receipt = await provider.getTransactionReceipt(hash);
        
        if (!receipt) {
            throw new Error(`Transaction receipt for ${hash} not found`);
        }
        
        let traces;
        let internalTransactions: InternalTransaction[] = [];
        try {
            traces = await provider.send('debug_traceTransaction', [hash, { tracer: 'callTracer' }]);
            internalTransactions = extractInternalTransactions(traces);
        } catch (error) {
            console.warn('Could not get transaction traces:', error);
        }
        
        const transactions = [mainTx];
        const tokens: Token[] = [];
        const tokenMap = new Map<string, Token>();
        
        const decodedLogs = decodeEventLogs(receipt?.logs ? [...receipt.logs] : []);
        const mutableDecodedLogs = decodedLogs.map(log => ({
            ...log,
            topics: [...log.topics]
        }));

        const decodedAllLogs = await decodeAllEventLogs(receipt?.logs ? [...receipt.logs] : []);

        const adaptedLogs = adaptDecodedLogs(decodedAllLogs);
        
        for (const log of receipt?.logs || []) {
            if (log.topics.length === 3 && log.topics[0] === ethers.id('Transfer(address,address,uint256)')) {
                const tokenAddress = log.address;
                
                if (tokenMap.has(tokenAddress)) continue;
                
                const tokenData = await getTokenData(tokenAddress);
                if (tokenData) {
                    tokens.push(tokenData);
                    tokenMap.set(tokenAddress, tokenData);
                }
            }
        }
        
        for (const tx of internalTransactions) {
            if (tx.to && !tokenMap.has(tx.to) && tx.to !== mainTx.to && tx.to !== mainTx.from) {
                try {
                    const isContract = (await provider.getCode(tx.to)) !== '0x';
                    if (isContract) {
                        const tokenData = await getTokenData(tx.to);
                        if (tokenData) {
                            tokens.push(tokenData);
                            tokenMap.set(tx.to, tokenData);
                        }
                    }
                } catch (error) {
                    console.error(`Error fetching token details for ${tx.to}:`, error);
                    continue;
                }
            }
        }

        const gasUsed = BigInt(receipt.gasUsed || 0);
        const gasPrice = mainTx.gasPrice ? ethers.parseUnits(mainTx.gasPrice, 'gwei') : BigInt(0);
        const gasCost = ethers.formatEther(gasUsed * gasPrice);
        
        return {
            id: hash,
            hash,
            summary: `Transaction ${hash.substring(0, 8)}...`,
            transactions,
            internalTransactions,
            tokens,
            eventLogs: mutableDecodedLogs,
            decodedAllEventLogs: adaptedLogs,
            totalValue: mainTx.value,
            gasCost,
            timestamp: mainTx.timestamp,
            blockNumber: receipt?.blockNumber || 0,
            contractInteractions: internalTransactions.length > 0
        };
    } catch (error) {
        console.error('Error fetching transaction flow:', error);
        throw new Error(`Failed to fetch transaction flow: ${error instanceof Error ? error.message : String(error)}`);
    }
};

export const getRecentTransactions = async (count: number): Promise<TransactionData[]> => {
    try {
        const latestBlock = await provider.getBlockNumber();
        
        const filter = {
            address: PYUSD_ADDRESS,
            topics: [ethers.id("Transfer(address,address,uint256)")]
        };

        const logs: ethers.Log[] = [];
        let currentBlock = latestBlock;
        const chunkSize = 5;
        
        while (logs.length < count && currentBlock >= 0) {
            const fromBlock = Math.max(currentBlock - chunkSize + 1, 0);
            const toBlock = currentBlock;
            
            const chunkLogs = await provider.getLogs({
                ...filter,
                fromBlock: ethers.toBeHex(fromBlock),
                toBlock: ethers.toBeHex(toBlock)
            });
            
            logs.unshift(...chunkLogs.reverse());
            
            currentBlock = fromBlock - 1;
        }
        
        const recentLogs = logs.slice(0, count);
        
        const transactions = await Promise.all(
            recentLogs.map(async (log) => {
                try {
                    if (log.address.toLowerCase() !== PYUSD_ADDRESS.toLowerCase()) return null;
                    if (log.topics.length !== 3 || log.data.length !== 66) return null;
                    
                    const parsedLog = pyusdContract.interface.parseLog(log);
                    const block = await provider.getBlock(log.blockNumber || 0);
                    const tx = await provider.getTransaction(log.transactionHash);
                    const receipt = await provider.getTransactionReceipt(log.transactionHash);
                    
                    return {
                        hash: log.transactionHash,
                        from: parsedLog?.args[0],
                        to: parsedLog?.args[1],
                        value: parsedLog?.args[2],
                        timestamp: block?.timestamp || 0,
                        status: receipt?.status === 1,
                        blockNumber: log.blockNumber,
                        gas: receipt?.gasUsed || 0,
                        gasPrice: tx?.gasPrice ? tx.gasPrice : 0
                    };
                } catch (error) {
                    console.warn(`Error processing tx ${log.transactionHash}:`, error);
                    return null;
                }
            })
        );
        
        return transactions.filter((tx): tx is TransactionData => tx !== null);
    } catch (error) {
        console.error("Error fetching recent transactions:", error);
        return [];
    }
};

export const fetchNetworkStatus = async (): Promise<NetworkStatus> => {
    const blockNumber = await provider.getBlockNumber();

    const gasPrice = (await provider.send('eth_gasPrice', [])).toString();
    
    const feeHistoryResult = await provider.send('eth_feeHistory', [
        '0xA',
        'latest',
        [25, 50, 75]
    ]);
    
    // Remove the last element
    const baseFees = feeHistoryResult.baseFeePerGas.slice(0, feeHistoryResult.baseFeePerGas.length - 1);
    
    // Parse fee history
    const feeHistory = baseFees.map((baseFee: string, index: number) => ({
        baseFeePerGas: baseFee,
        gasUsedRatio: feeHistoryResult.gasUsedRatio[index] || 0,
        oldestBlock: parseInt(feeHistoryResult.oldestBlock, 16) + index,
        reward: feeHistoryResult.reward ? feeHistoryResult.reward[index] : []
    }));
    
    // Get txpool status
    let pendingTxCount = 0;
    let queuedTxCount = 0;
    
    try {
        const txpoolStatus = await provider.send('txpool_status', []);
        pendingTxCount = parseInt(txpoolStatus.pending, 16);
        queuedTxCount = parseInt(txpoolStatus.queued, 16);
    } catch (error) {
        console.warn('Failed to fetch txpool status:', error);
        pendingTxCount = (await provider.send('eth_pendingTransactions', [])).length;
    }
    
    const estimatedGas = {
        low: Number(gasPrice) * 0.9,
        average: Number(gasPrice),
        fast: Number(gasPrice) * 1.2
    };
    
    return {
        blockNumber,
        gasPrice,
        feeHistory,
        pendingTxCount,
        queuedTxCount,
        estimatedGas
    };
};

export const fetchBlockchainData = async (count: number) => {
    try {
        const [networkStatus, pyusdTransactions] = await Promise.all([
            fetchNetworkStatus(),
            getRecentTransactions(count)
        ]);
        
        return {
            networkStatus,
            pyusdTransactions
        };
    } catch (error) {
        console.error('Error fetching blockchain data:', error);
        throw error;
    }
};

export const getTotalSupply = async (): Promise<string> => {
    const totalSupply = await pyusdContract.totalSupply();
    const decimals = await pyusdContract.decimals();
    return ethers.formatUnits(totalSupply, decimals);
};

export const getETHPrice = async (): Promise<number> => {
    const response = await fetch(
        `https://api.etherscan.io/v2/api?chainid=1&module=stats&action=ethprice&apikey=${ETHERSCAN_API_KEY}`
    );
    const data = await response.json();
    return data.result.ethusd;
};

export const getPyUSDPriceHistory = async () => {
    try {
        const options = {
            method: 'GET',
            headers: {
                accept: 'application/json',
                'x-cg-demo-api-key': `${COINGECKO_API_KEY}`
            }
        };
    
        const response = await fetch(
            'https://api.coingecko.com/api/v3/coins/paypal-usd/market_chart?vs_currency=usd&days=30&interval=daily&precision=full',
            options
        );
    
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
    
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching PYUSD Price History:', error);
    }
};

export const getPyUSDData = async () => {
    try {
        const options = {
            method: 'GET',
            headers: {
                accept: 'application/json',
                'x-cg-demo-api-key': `${COINGECKO_API_KEY}`
            }
        };
    
        const response = await fetch(
            'https://api.coingecko.com/api/v3/coins/paypal-usd?localization=false',
            options
        );
    
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
    
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching coins:', error);
    }
};

let cachedTokenList: any[] | null = null;
let tokenFetchPromise: Promise<any[]> | null = null;

async function fetchTokenListOnce(): Promise<any[]> {
    if (cachedTokenList) {
        return cachedTokenList;
    }
    if (!tokenFetchPromise) {
        tokenFetchPromise = axios
        .get('https://tokens.coingecko.com/solana/all.json', {
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
                Accept: 'application/json',
            },
        })
        .then((response) => {
            cachedTokenList = response.data.tokens;
            return cachedTokenList!;
        })
        .catch((error) => {
            console.error('Error fetching token list:', error);
            tokenFetchPromise = null;
            throw error;
        });
    }
    return tokenFetchPromise;
};

export async function getSolanaTokenDetails(address: string): Promise<Token> {
    try {
        const tokens = await fetchTokenListOnce();
        const normalizedAddress = address.toLowerCase();
    
        const token = tokens.find((t: any) => t.address.toLowerCase() === normalizedAddress);
    
        if (token) {
            return {
                address,
                symbol: token.symbol || address.substring(0, 6),
                name: token.name || 'Unknown',
                decimals: token.decimals || 18,
                logoURI: token.logoURI || token.logo || '',
            };
        } else {
            return fallbackTokenDetails(address);
        }
    } catch (error) {
        console.error('Error fetching token details:', error);
        return fallbackTokenDetails(address);
    }
};

function fallbackTokenDetails(address: string): Token {
    return {
        address,
        symbol: "Unknown",
        name: "Unknown Token",
        decimals: 18
    };
};

export const getPyusdTransactionStats = async (blockNumber: number) : Promise<PyusdTransactionStats | null> => {
    let totalTransactions = 0;
    let totalGasUsed = BigInt(0);
    const transactionCounts: { block: number, count: number, gasUsed: number }[] = [];
    const transactionTypes: Record<string, number> = {};

    try {
        const normalizedPyusd = PYUSD_ADDRESS.toLowerCase();

        for (let i = 0; i < 10; i++) {
            const currentBlock = blockNumber - i;
            let currentBlockHex = ethers.toBeHex(BigInt(currentBlock));

            // Normalize hex format
            currentBlockHex = "0x" + currentBlockHex.slice(2).replace(/^0+/, '');
            const traces = await provider.send('trace_block', [currentBlockHex]);

            if (!traces || traces.length === 0) {
                console.warn('No traces found for block', currentBlock);
                continue;
            }

            const pyusdTransactions = traces.filter((trace: any) =>
                trace.action &&
                (trace.action.to?.toLowerCase() === normalizedPyusd ||
                    trace.action.from?.toLowerCase() === normalizedPyusd)
            );

            let blockGasUsed = BigInt(0);
            for (const tx of pyusdTransactions) {
                if (tx.result && tx.result.gasUsed) {
                    blockGasUsed += BigInt(tx.result.gasUsed);
                }
                const type = tx.type || 'unknown';
                transactionTypes[type] = (transactionTypes[type] || 0) + 1;
            }

            totalTransactions += pyusdTransactions.length;
            totalGasUsed += blockGasUsed;
            transactionCounts.push({
                block: currentBlock,
                count: pyusdTransactions.length,
                gasUsed: Number(blockGasUsed),
            });
        }

        return {
            totalTransactions,
            avgTransactionsPerBlock: totalTransactions / 10,
            avgGasUsed: totalGasUsed / BigInt(10),
            totalGasUsed: Number(totalGasUsed),
            transactionCounts,
            transactionTypes,
        };
    } catch (error) {
        console.warn('Could not get PYUSD transaction stats:', error);
        return null;
    }
};