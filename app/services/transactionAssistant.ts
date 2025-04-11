/* eslint-disable @typescript-eslint/no-explicit-any */
import { ethers } from 'ethers';
import { 
    provider,
    getTransactionFlow, 
    fetchNetworkStatus,
    getPyUSDData,
    getTotalSupply,
    getPyusdTransactionStats
} from './blockchain';
import { DecodedEventLog, TransactionFlow } from '../types';
import {
    GoogleGenerativeAI,
} from "@google/generative-ai";

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

const QUERY_PATTERNS = {
    EXPLAIN_TRANSACTION: [
        /explain (transaction|tx) (0x[a-fA-F0-9]{64})/i,
        /what happened (in|on|with) (transaction|tx) (0x[a-fA-F0-9]{64})/i,
        /analyze (transaction|tx) (0x[a-fA-F0-9]{64})/i,
        /(tell me about|describe) (transaction|tx) (0x[a-fA-F0-9]{64})/i,
        /(show|get) (transaction|tx) (details|info) (for|of) (0x[a-fA-F0-9]{64})/i
    ],
    MARKET_TREND: [
        /how is (the market|pyusd) (performing|doing)/i,
        /what('s| is) the current (market|price) (trend|status)/i,
        /market (overview|summary|analysis)/i,
        /pyusd (performance|status|analysis)/i,
        /how's pyusd doing/i
    ],
    TOKEN_INFO: [
        /tell me about (token|contract) (0x[a-fA-F0-9]{40})/i,
        /what is (token|contract) (0x[a-fA-F0-9]{40})/i,
        /info on (token|contract) (0x[a-fA-F0-9]{40})/i,
        /(show|get) (token|contract) (details|info) (for|of) (0x[a-fA-F0-9]{40})/i,
        /analyze (token|contract) (0x[a-fA-F0-9]{40})/i
    ],
    TRANSACTION_VOLUME: [
        /what('s| is) the (transaction|tx) volume/i,
        /how many transactions/i,
        /transaction (count|statistics|stats)/i,
        /pyusd (transaction|tx) (volume|activity)/i,
        /show me (transaction|tx) (stats|metrics|data)/i
    ],
};

export class TransactionAssistant {
    private genAI: any;
    private model: any;
    private generationConfig: any;
    private chatHistory: Array<{role: string, parts: Array<{text: string}>}> = [];

    constructor() {
        if (GEMINI_API_KEY) {
            this.genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
            this.model = this.genAI.getGenerativeModel({
                model: "gemini-1.5-pro",
            });
            this.generationConfig = {
                temperature: 0.7,
                topP: 0.95,
                topK: 40,
                maxOutputTokens: 8192,
                responseModalities: [],
                responseMimeType: "text/plain",
            };
            this.chatHistory = [];
        } else {
            console.warn("GEMINI_API_KEY is not set. Advanced AI features will not be available.");
        }
    }

    public async processQuery(query: string): Promise<string> {
        try {
            const queryType = this.identifyQueryType(query);
            
            let response = '';
            
            switch (queryType.type) {
                case 'EXPLAIN_TRANSACTION':
                    response = await this.explainTransaction(queryType.params.txHash);
                    break;
                case 'MARKET_TREND':
                    response = await this.analyzeMarketTrend();
                    break;
                case 'TOKEN_INFO':
                    response = await this.explainToken(queryType.params.tokenAddress);
                    break;
                case 'TRANSACTION_VOLUME':
                    response = await this.getTransactionVolumeInfo();
                    break;
                default:
                    if (this.model) {
                        response = await this.getAIEnhancedResponse(query);
                    } else {
                        response = this.getGenericResponse(query);
                    }
            }
            
            // Store interaction in chat history if AI is available
            if (this.model) {
                this.chatHistory.push({ role: "user", parts: [{ text: query }] });
                this.chatHistory.push({ role: "model", parts: [{ text: response }] });
                
                // Trim history if it gets too long (keep last 10 exchanges)
                if (this.chatHistory.length > 20) {
                    this.chatHistory = this.chatHistory.slice(this.chatHistory.length - 20);
                }
            }
            
            return response;
        } catch (error) {
            console.error('Error processing query:', error);
            return `I'm sorry, I encountered an error while processing your request. Please try again or rephrase your question. (Error: ${error instanceof Error ? error.message : String(error)})`;
        }
    };

    private async getAIEnhancedResponse(query: string): Promise<string> {
        try {
            const chatSession = this.model.startChat({
                generationConfig: this.generationConfig,
                history: this.chatHistory,
            });
            
            // Enhance the query with blockchain context
            const enhancedQuery = `
                Context: I am a blockchain transaction assistant specializing in explaining cryptocurrency 
                transactions, token information, and market trends, particularly for PYUSD.
                
                User query: ${query}
                
                Please provide a helpful, accurate response about blockchain concepts or transactions.
                If you don't know the answer, suggest what specific blockchain data might help answer the query.
            `;
            
            // Send the message to the model
            const result = await chatSession.sendMessage(enhancedQuery);
            const response = result.response.text();
            
            return response;
        } catch (error) {
            console.error("Error using Gemini AI:", error);
            return this.getGenericResponse(query);
        }
    };

    private identifyQueryType(query: string): { type: string; params: any } {
        for (const pattern of QUERY_PATTERNS.EXPLAIN_TRANSACTION) {
            const match = query.match(pattern);
            if (match) {
                const txHash = match[2].startsWith('0x') ? match[2] : match[3];
                return { type: 'EXPLAIN_TRANSACTION', params: { txHash } };
            }
        }

        // Check for market trend queries
        for (const pattern of QUERY_PATTERNS.MARKET_TREND) {
            if (pattern.test(query)) {
                return { type: 'MARKET_TREND', params: {} };
            }
        }

        // Check for token info queries
        for (const pattern of QUERY_PATTERNS.TOKEN_INFO) {
            const match = query.match(pattern);
            if (match) {
                const tokenAddress = match[2];
                return { type: 'TOKEN_INFO', params: { tokenAddress } };
            }
        }

        // Check for transaction volume queries
        for (const pattern of QUERY_PATTERNS.TRANSACTION_VOLUME) {
            if (pattern.test(query)) {
                return { type: 'TRANSACTION_VOLUME', params: {} };
            }
        }

        // Default response for unrecognized queries
        return { type: 'UNKNOWN', params: {} };
    };

    private async explainTransaction(txHash: string): Promise<string> {
        if (!ethers.isHexString(txHash, 32)) {
            return `The provided transaction hash (${txHash}) doesn't appear to be valid. A transaction hash should be 66 characters long, starting with '0x' followed by 64 hexadecimal characters.`;
        }

        try {
            const txFlow = await getTransactionFlow(txHash);
            
            // Generate explanation
            let explanation = this.generateTransactionExplanation(txFlow);
            
            // Enhance explanation with AI
            if (this.model) {
                try {
                    explanation = await this.enhanceTransactionExplanation(explanation, txFlow);
                } catch (aiError) {
                    console.error("Error enhancing explanation with AI:", aiError);
                }
            }
            
            return explanation;
        } catch (error) {
            console.error(`Error explaining transaction ${txHash}:`, error);
            return `I couldn't find information about transaction ${txHash}. The transaction may not exist or there might be an issue with the blockchain connection.`;
        }
    };

    private async enhanceTransactionExplanation(baseExplanation: string, txFlow: TransactionFlow): Promise<string> {
        const chatSession = this.model.startChat({
            generationConfig: this.generationConfig,
            history: [],
        });
        
        const txData = JSON.stringify({
            hash: txFlow.hash,
            blockNumber: txFlow.blockNumber,
            timestamp: txFlow.timestamp,
            from: txFlow.transactions[0].from,
            to: txFlow.transactions[0].to,
            method: txFlow.transactions[0].method,
            value: txFlow.transactions[0].value,
            gasUsed: txFlow.transactions[0].gasUsed,
        });
        
        const enhancementPrompt = `
            You are a blockchain transaction analyzer. I have a transaction explanation
            that I'd like you to enhance to make it more helpful and clear for users.
            
            Original explanation:
            ${baseExplanation}
            
            Transaction data:
            ${txData}
            
            Please enhance this explanation with:
            1. More context about what this transaction does in simpler terms
            2. Potential implications or reasons for this transaction
            3. Any security considerations if applicable
            
            Return the enhanced explanation in markdown format. Keep the original sections
            but improve clarity and add more useful context.
        `;
        
        const result = await chatSession.sendMessage(enhancementPrompt);
        return result.response.text();
    };

    private generateTransactionExplanation(txFlow: TransactionFlow): string {
        const mainTx = txFlow.transactions[0];
        
        let explanation = `## Transaction ${txFlow.hash.substring(0, 10)}... Analysis\n\n`;
        
        // Basic transaction info
        explanation += `**Transaction Type:** ${this.identifyTransactionType(txFlow)}\n`;
        explanation += `**Block Number:** ${txFlow.blockNumber}\n`;
        explanation += `**Timestamp:** ${new Date(txFlow.timestamp * 1000).toLocaleString('en-US', { timeZone: 'UTC' })} UTC\n`;
        explanation += `**Status:** ${mainTx.status === 'success' ? '✅ Success' : '❌ Failed'}\n`;
        explanation += `**Gas Used:** ${mainTx.gasUsed} (${txFlow.gasCost} ETH)\n\n`;
        
        // Transaction flow
        explanation += `### Transaction Flow\n`;
        explanation += `From: \`${mainTx.from}\`\n`;
        explanation += `To: \`${mainTx.to}\`\n`;
        
        if (mainTx.method) {
            explanation += `Method Called: \`${mainTx.method}\`\n`;
        }
        
        if (mainTx.value && mainTx.value !== '0.0') {
            explanation += `ETH Value: ${mainTx.value} ETH\n`;
        }
        
        // Token transfers
        const transfers = this.extractTokenTransfers(txFlow.decodedAllEventLogs as DecodedEventLog[], txFlow);
        if (transfers.length > 0) {
            explanation += `\n### Token Transfers\n`;
            
            transfers.forEach((transfer, index) => {
                const token = txFlow.tokens.find(t => 
                    t.symbol.toLowerCase() === transfer.token.toLowerCase()
                );
                
                const tokenDecimals = token?.decimals || 18;
                
                const formattedValue = parseFloat(
                    ethers.formatUnits(transfer.value, tokenDecimals)
                ).toLocaleString('en-US', {
                    maximumFractionDigits: 8,
                    minimumFractionDigits: 0,
                });
                
                explanation += `${index + 1}. ${transfer.token} - From \`${transfer.from.substring(0, 8)}...${transfer.from.substring(transfer.from.length - 6)}\` to \`${transfer.to.substring(0, 8)}...${transfer.to.substring(transfer.to.length - 6)}\`: ${formattedValue} ${transfer.token}\n`;
            });              
        }
        
        // Event logs
        if (txFlow.decodedAllEventLogs && txFlow.decodedAllEventLogs.length > 0) {
            explanation += `\n### All Event Logs\n`;
            
            // Filter out unknown event logs
            const validEventLogs = txFlow.decodedAllEventLogs.filter(log => 
                log.eventType && log.eventType.toLowerCase() !== 'unknown'
            );
            
            validEventLogs.forEach((log, index) => {
                const eventType = log.eventType || 'Unknown';
                const contractAddress = log.address;
                
                // Find contract name if possible
                let contractName = '';
                const token = txFlow.tokens.find(t => 
                    t.address.toLowerCase() === contractAddress.toLowerCase()
                );
                
                if (token) {
                    contractName = token.symbol;
                } else {
                    contractName = `Contract (${contractAddress.substring(0, 8)}...${contractAddress.substring(contractAddress.length - 8)})`;
                }
                
                explanation += `${index + 1}. **${eventType}** from \`${contractName}\` (\`${contractAddress.substring(0, 10)}...\`)\n`;
                
                // Add decoded fields for better understanding
                if (log.decoded) {
                    explanation += `   **Details**:\n`;
                    
                    Object.entries(log.decoded).forEach(([key, value]) => {
                        let formattedValue = value;
                        
                        // Handle BigInt values
                        if (typeof value === 'bigint') {
                            if (key.toLowerCase().includes('amount') || key.toLowerCase().includes('value')) {
                                const tokenAddr = log.decoded.tokenAddress;
                                const token = tokenAddr ? 
                                    txFlow.tokens.find(t => t.address.toLowerCase() === tokenAddr.toLowerCase()) : 
                                    null;
                                
                                const decimals = token?.decimals || 18;
                                formattedValue = parseFloat(ethers.formatUnits(value.toString(), decimals))
                                    .toLocaleString('en-US', {
                                        maximumFractionDigits: 8
                                    });
                            } else {
                                formattedValue = value.toString();
                            }
                        }
                        
                        if (key !== 'tokenAddress') {
                            explanation += `     - ${key}: ${formattedValue}\n`;
                        }
                    });
                }
            });
        }
        
        // Contract interactions
        if (txFlow.contractInteractions) {
            explanation += `\n### Contract Interactions\n`;
            explanation += `This transaction interacted with ${txFlow?.internalTransactions?.length} contracts or addresses internally.\n`;
            
            // List key internal transactions
            const significantInternalTxs = txFlow?.internalTransactions?.filter(tx => 
                tx.value !== '0.0' || tx.callType === 'CREATE' || tx.callType === 'CREATE2'
            );
            
            if (significantInternalTxs && significantInternalTxs.length > 0) {
                explanation += `\n**Key Internal Transactions:**\n`;
                significantInternalTxs.forEach((tx, index) => {
                    explanation += `${index + 1}. ${tx.callType} - From \`${tx.from.substring(0, 8)}...${tx.from.substring(tx.from.length - 6)}\` to \`${tx.to.substring(0, 8)}...${tx.to.substring(tx.to.length - 6)}\`${tx.value !== '0.0' ? `: ${tx.value} ETH` : ''}\n`;
                });
            }
        }
        
        // Summary
        explanation += `\n### Summary\n`;
        explanation += this.generateTransactionSummary(txFlow, transfers);
        
        return explanation;
    };

    private identifyTransactionType(txFlow: TransactionFlow): string {
        const mainTx = txFlow.transactions[0];
        const transfers = this.extractTokenTransfers(txFlow.decodedAllEventLogs as DecodedEventLog[], txFlow);
        
        // Check for contract creation
        if (!mainTx.to) {
            return "Contract Creation";
        }
        
        if (mainTx.input === '0x' && parseFloat(mainTx.value) > 0) {
            return "ETH Transfer";
        }
        
        // Check for token transfers
        if (transfers.length > 0) {
            if (transfers.length === 1) {
                return `${transfers[0].token} Token Transfer`;
            } else {
                return "Multi-Token Transfer";
            }
        }
        
        // Check for specific method calls
        if (mainTx.method) {
            if (mainTx.method.toLowerCase().includes('swap') || mainTx.method.includes('Swap')) {
                return "Token Swap";
            } else if (mainTx.method.toLowerCase().includes('mint') || mainTx.method.includes('Mint')) {
                return "Token Minting";
            } else if (mainTx.method.toLowerCase().includes('burn') || mainTx.method.includes('Burn')) {
                return "Token Burning";
            } else if (mainTx.method.toLowerCase().includes('approve') || mainTx.method.includes('Approve')) {
                return "Token Approval";
            } else if (mainTx.method.toLowerCase().includes('stake') || mainTx.method.includes('Stake')) {
                return "Staking";
            } else if (mainTx.method.toLowerCase().includes('claim') || mainTx.method.includes('Claim')) {
                return "Reward Claim";
            } else if (mainTx.method.toLowerCase().includes('withdraw') || mainTx.method.includes('Withdraw')) {
                return "Withdrawal";
            } else if (mainTx.method.toLowerCase().includes('deposit') || mainTx.method.includes('Deposit')) {
                return "Deposit";
            }
            
            return `Contract Interaction (${mainTx.method})`;
        }
        
        // Generic contract interaction
        return "Contract Interaction";
    };

    private extractTokenTransfers(logs: DecodedEventLog[], txFlow: TransactionFlow): Array<{
        token: string;
        from: string;
        to: string;
        value: string;
    }> {
        const transfers: Array<{
            token: string;
            from: string;
            to: string;
            value: string;
        }> = [];
        
        logs.forEach(log => {
            if (
                log.eventType && 
                ['transfer', 'swap'].includes(log.eventType.toLowerCase()) && 
                log.decoded
            ) {
                let from = '';
                let to = '';
                let tokenAddress = '';
                let valueRaw: string | number | bigint = '0';
                
                // Extract fields based on event type
                if (log.eventType.toLowerCase() === 'transfer') {
                    from = log.decoded.from || '';
                    to = log.decoded.to || '';
                    tokenAddress = log.decoded.tokenAddress || '';
                    valueRaw = log.decoded.value || log.decoded.amount || '0';
                } else if (log.eventType.toLowerCase() === 'swap') {
                    from = log.decoded.sender || '';
                    to = log.decoded.recipient || '';
                    tokenAddress = log.decoded.tokenAddress || '';
                    valueRaw = log.decoded.amount0 || '0';
                }
                
                // Skip if essential data is missing
                if (!tokenAddress || !from || !to) {
                    return;
                }
                
                // Convert any value type to string
                let value: string;
                if (typeof valueRaw === 'bigint') {
                    value = valueRaw.toString();
                } else if (typeof valueRaw === 'number') {
                    value = valueRaw.toString();
                } else {
                    value = String(valueRaw);
                }
                
                // Find token info including correct decimals
                let tokenSymbol = '';
                
                const token = txFlow.tokens.find(t => 
                    t.address.toLowerCase() === tokenAddress.toLowerCase()
                );
                
                if (token) {
                    tokenSymbol = token.symbol;
                    transfers.push({
                        token: tokenSymbol,
                        from,
                        to,
                        value
                    });
                }
            }
        });
        
        return transfers;
    };

    private generateTransactionSummary(
        txFlow: TransactionFlow, 
        transfers: Array<{ token: string; from: string; to: string; value: string }>
    ): string {
        const mainTx = txFlow.transactions[0];
        const txType = this.identifyTransactionType(txFlow);
        
        // Start with a basic summary based on transaction type
        let summary = '';
        
        if (txType === 'ETH Transfer') {
            summary = `This transaction is a simple ETH transfer of ${mainTx.value} ETH from ${mainTx.from.substring(0, 10)}... to ${mainTx.to.substring(0, 10)}...`;
        } else if (txType.includes('Token Transfer')) {
            const transfer = transfers[0];
            summary = `This transaction transfers ${transfer.value} ${transfer.token} tokens from ${transfer.from.substring(0, 10)}... to ${transfer.to.substring(0, 10)}...`;
        } else if (txType === 'Multi-Token Transfer') {
            summary = `This transaction involves multiple token transfers (${transfers.length} in total), which could indicate a complex swap, liquidity provision, or other DeFi activity.`;
        } else if (txType === 'Token Swap') {
            summary = `This transaction appears to be a token swap, exchanging one type of token for another through a decentralized exchange or automated market maker.`;
        } else if (txType === 'Contract Creation') {
            summary = `This transaction created a new smart contract on the blockchain from address ${mainTx.from.substring(0, 10)}...`;
        } else if (txType.includes('Contract Interaction')) {
            summary = `This transaction interacts with contract ${mainTx.to.substring(0, 10)}... using the ${mainTx.method || 'unknown'} method, which ${this.explainCommonMethod(mainTx.method || '')}.`;
        }
        
        // Add additional context based on gas usage
        if (parseFloat(txFlow.gasCost as string) > 0.01) {
            summary += ` The transaction used a significant amount of gas (${txFlow.gasCost} ETH), indicating complex contract execution.`;
        }
        
        return summary;
    };

    private explainCommonMethod(methodName: string): string {
        const lowerMethod = methodName.toLowerCase();
        
        if (lowerMethod.includes('swap')) {
            return 'typically exchanges one token for another';
        } else if (lowerMethod.includes('mint')) {
            return 'creates new tokens';
        } else if (lowerMethod.includes('burn')) {
            return 'destroys or removes tokens from circulation';
        } else if (lowerMethod.includes('approve')) {
            return 'authorizes a contract to spend tokens on behalf of the user';
        } else if (lowerMethod.includes('transfer')) {
            return 'moves tokens from one address to another';
        } else if (lowerMethod.includes('stake')) {
            return 'locks tokens to earn rewards or participate in governance';
        } else if (lowerMethod.includes('withdraw')) {
            return 'removes assets from a protocol';
        } else if (lowerMethod.includes('deposit')) {
            return 'adds assets to a protocol';
        } else if (lowerMethod.includes('claim')) {
            return 'collects rewards or airdrops';
        } else if (lowerMethod.includes('vote')) {
            return 'participates in governance decisions';
        } else {
            return 'performs a specialized operation within the contract';
        }
    };

    private async analyzeMarketTrend(): Promise<string> {
        try {
            const [networkStatus, pyusdData, totalSupply, blockNumber] = await Promise.all([
                fetchNetworkStatus(),
                getPyUSDData(),
                getTotalSupply(),
                provider.getBlockNumber()
            ]);
            
            // Get transaction stats based on current block
            const txStats = await getPyusdTransactionStats(blockNumber);
            
            let analysis = '## PYUSD Market Analysis\n\n';
            
            // PYUSD Price Information
            if (pyusdData && pyusdData.market_data) {
                const price = pyusdData.market_data.current_price.usd;
                const priceChange24h = pyusdData.market_data.price_change_percentage_24h;
                const marketCap = pyusdData.market_data.market_cap.usd;
                const volume24h = pyusdData.market_data.total_volume.usd;
                
                analysis += `### Current Status\n`;
                analysis += `**Current Price:** $${price.toFixed(4)}\n`;
                analysis += `**24h Change:** ${priceChange24h.toFixed(2)}%\n`;
                analysis += `**Market Cap:** $${(marketCap / 1000000).toLocaleString('en-US')} million\n`;
                analysis += `**24h Volume:** $${(volume24h / 1000000).toLocaleString('en-US')} million\n`;
                analysis += `**Total Supply:** ${Number(totalSupply).toLocaleString('en-US')} PYUSD\n\n`;
            }
            
            // Network Status
            analysis += `### Network Status\n`;
            analysis += `**Current Block:** ${networkStatus.blockNumber}\n`;
            analysis += `**Gas Price:** ${ethers.formatUnits(networkStatus.gasPrice, 'gwei')} gwei\n`;
            analysis += `**Pending Transactions:** ${networkStatus.pendingTxCount}\n\n`;
            
            // Transaction Volume
            if (txStats) {
                analysis += `### PYUSD Transaction Activity\n`;
                analysis += `**Recent Transactions:** ${txStats.totalTransactions} (last 10 blocks)\n`;
                analysis += `**Avg. Transactions per Block:** ${txStats.avgTransactionsPerBlock.toFixed(2)}\n`;
                analysis += `**Total Gas Used:** ${txStats.totalGasUsed.toLocaleString('en-US')}\n\n`;
                
                // Transaction types breakdown
                if (Object.keys(txStats.transactionTypes).length > 0) {
                    analysis += `**Transaction Types:**\n`;
                    for (const [type, count] of Object.entries(txStats.transactionTypes)) {
                        analysis += `- ${type}: ${count}\n`;
                    }
                }
            }
            
            // If AI is available, enhance the analysis
            if (this.model) {
                try {
                    const enhancedAnalysis = await this.enhanceMarketAnalysis(analysis, {
                        price: pyusdData?.market_data?.current_price?.usd,
                        priceChange24h: pyusdData?.market_data?.price_change_percentage_24h,
                        marketCap: pyusdData?.market_data?.market_cap?.usd,
                        volume24h: pyusdData?.market_data?.total_volume?.usd,
                        totalSupply,
                        txStats
                    });
                    return enhancedAnalysis;
                } catch (aiError) {
                    console.error("Error enhancing market analysis with AI:", aiError);
                }
            }
            
            return analysis;
        } catch (error) {
            console.error('Error analyzing market trend:', error);
            return 'I apologize, but I could not retrieve the current market data. Please try again later.';
        }
    };

    private async enhanceMarketAnalysis(baseAnalysis: string, marketData: any): Promise<string> {
        const chatSession = this.model.startChat({
            generationConfig: this.generationConfig,
            history: [],
        });
        
        const enhancementPrompt = `
            You are a cryptocurrency market analyst specializing in PYUSD. I have a market
            analysis that I'd like you to enhance with more insights and context.
            
            Original analysis:
            ${baseAnalysis}
            
            Market data summary:
            ${JSON.stringify(marketData, (_, value) =>
                typeof value === 'bigint' ? value.toString() : value
            )}
            
            Please enhance this analysis by:
            1. Adding market context - how does this compare to previous periods or other stablecoins?
            2. Identifying any notable patterns in the transaction data
            3. Providing a concise market outlook based on the current metrics
            
            Return the enhanced analysis in markdown format, keeping the original sections
            but adding your additional insights in a new "Market Insights" section.
        `;
        
        const result = await chatSession.sendMessage(enhancementPrompt);
        return result.response.text();
    };

    private async explainToken(tokenAddress: string): Promise<string> {
        try {
            if (!ethers.isAddress(tokenAddress)) {
                return `The provided address (${tokenAddress}) doesn't appear to be a valid Ethereum address.`;
            }
            
            const tokenContract = new ethers.Contract(
                tokenAddress,
                [
                    'function name() view returns (string)',
                    'function symbol() view returns (string)',
                    'function decimals() view returns (uint8)',
                    'function totalSupply() view returns (uint256)',
                    'function balanceOf(address) view returns (uint256)'
                ],
                provider
            );
            
            // Try to get token information
            const [name, symbol, decimals, totalSupply] = await Promise.all([
                tokenContract.name().catch(() => 'Unknown'),
                tokenContract.symbol().catch(() => 'Unknown'),
                tokenContract.decimals().catch(() => 18),
                tokenContract.totalSupply().catch(() => 0)
            ]);
            
            // Get contract code to verify if it's a contract
            const code = await provider.getCode(tokenAddress);
            const isContract = code !== '0x';
            
            // Check if this is a valid token
            const isToken = name !== 'Unknown' && symbol !== 'Unknown';
            
            let info = `## ${isToken ? 'Token' : 'Contract'} Information\n\n`;
            info += `**Address:** \`${tokenAddress}\`\n`;
            
            if (isToken) {
                info += `**Name:** ${name}\n`;
                info += `**Symbol:** ${symbol}\n`;
                info += `**Decimals:** ${decimals}\n`;
                info += `**Total Supply:** ${parseFloat(ethers.formatUnits(totalSupply, decimals)).toLocaleString('en-US')}\n\n`;
            } else if (isContract) {
                info += `**Type:** Smart Contract\n`;
                info += `**Code Size:** ${(code.length - 2) / 2} bytes\n\n`;
                info += `This appears to be a smart contract, but I couldn't identify it as a standard token (ERC-20, ERC-721, etc.).\n`;
            } else {
                info += `**Type:** Regular Address (not a contract)\n\n`;
                info += `This is a regular Ethereum address, not a smart contract.\n`;
            }
            
            // Add a note about interactions
            if (isContract) {
                info += `\nTo analyze interactions with this ${isToken ? 'token' : 'contract'}, you can ask me about specific transactions that involve it.`;
            }
            
            // If AI is available, enhance the token information
            if (this.model && isToken) {
                try {
                    const enhancedInfo = await this.enhanceTokenInfo(info, {
                        address: tokenAddress,
                        name,
                        symbol,
                        decimals,
                        totalSupply: ethers.formatUnits(totalSupply, decimals)
                    });
                    return enhancedInfo;
                } catch (aiError) {
                    console.error("Error enhancing token info with AI:", aiError);
                }
            }
            
            return info;
        } catch (error) {
            console.error(`Error explaining token ${tokenAddress}:`, error);
            return `I couldn't retrieve detailed information about ${tokenAddress}. This could be because it's not a standard token contract or there's an issue with the blockchain connection.`;
        }
    };

    private async enhanceTokenInfo(baseInfo: string, tokenData: any): Promise<string> {
        const chatSession = this.model.startChat({
            generationConfig: this.generationConfig,
            history: [],
        });
        
        const enhancementPrompt = `
            You are a cryptocurrency token analyst. I have information about a token
            that I'd like you to enhance with more insights and context.
            
            Original token information:
            ${baseInfo}
            
            Token data:
            ${JSON.stringify(tokenData, (_, value) =>
                typeof value === 'bigint' ? value.toString() : value
            )}
            
            Please enhance this information by:
            1. Explaining what this type of token typically does or is used for
            2. Any notable characteristics based on supply, decimals, etc.
            3. General security considerations when interacting with such tokens
            
            Return the enhanced information in markdown format, keeping the original sections
            but adding your additional insights in a new "Token Insights" section.
        `;
        
        const result = await chatSession.sendMessage(enhancementPrompt);
        return result.response.text();
    };

    private async getTransactionVolumeInfo(): Promise<string> {
        try {
            const blockNumber = await provider.getBlockNumber();
            const txStats = await getPyusdTransactionStats(blockNumber);
            
            if (!txStats) {
                return "I'm sorry, I couldn't retrieve transaction statistics at the moment. Please try again later.";
            }
            
            let info = '## PYUSD Transaction Statistics\n\n';
            
            // Recent volume
            info += `### Recent Activity (Last 10 Blocks)\n`;
            info += `**Total Transactions:** ${txStats.totalTransactions}\n`;
            info += `**Average Per Block:** ${txStats.avgTransactionsPerBlock.toFixed(2)}\n`;
            info += `**Total Gas Used:** ${txStats.totalGasUsed.toLocaleString('en-US')}\n\n`;
            
            // Transaction types
            if (Object.keys(txStats.transactionTypes).length > 0) {
                info += `### Transaction Types\n`;
                for (const [type, count] of Object.entries(txStats.transactionTypes)) {
                    const percentage = (count / txStats.totalTransactions * 100).toFixed(1);
                    info += `**${type}:** ${count} (${percentage}%)\n`;
                }
                info += '\n';
            }
            
            // Block-by-block breakdown
            info += `### Block-by-Block Breakdown\n`;
            txStats.transactionCounts.forEach(blockData => {
                info += `**Block ${blockData.block}:** ${blockData.count} transactions, ${blockData.gasUsed.toLocaleString('en-US')} gas used\n`;
            });
            
            // If AI is available, enhance the statistics
            if (this.model) {
                try {
                    const enhancedStats = await this.enhanceTransactionStats(info, txStats);
                    return enhancedStats;
                } catch (aiError) {
                    console.error("Error enhancing transaction stats with AI:", aiError);
                }
            }
            
            return info;
        } catch (error) {
            console.error('Error getting transaction volume info:', error);
            return "I'm sorry, I couldn't retrieve transaction volume statistics at this time. Please try again later.";
        }
    };

    private async enhanceTransactionStats(baseStats: string, txStats: any): Promise<string> {
        const chatSession = this.model.startChat({
            generationConfig: this.generationConfig,
            history: [],
        });
        
        const enhancementPrompt = `
            You are a blockchain data analyst specializing in transaction statistics. 
            I have transaction statistics that I'd like you to enhance with more insights.
            
            Original statistics:
            ${baseStats}
            
            Transaction data:
            ${JSON.stringify(txStats, (_, value) =>
                typeof value === 'bigint' ? value.toString() : value
            )}
            
            Please enhance these statistics by:
            1. Identifying any patterns or anomalies in the transaction data
            2. Providing context on how these statistics compare to typical network activity
            3. Suggesting what these statistics might indicate about network usage
            
            Return the enhanced statistics in markdown format, keeping the original sections
            but adding your additional insights in a new "Statistical Insights" section.
        `;
        
        const result = await chatSession.sendMessage(enhancementPrompt);
        return result.response.text();
    };

    private getGenericResponse(query: string): string {
        console.log(`Generic response for query: ${query}`);
        return `I'm not sure what you're asking about. Here are some things you can ask me:

        1. "Explain transaction 0x..." - Get insights about a specific transaction
        2. "How is PYUSD performing?" - Get current market trends
        3. "Tell me about token 0x..." - Get information about a specific token
        4. "What's the transaction volume?" - Get transaction statistics

        Please try one of these formats or rephrase your question.`;
    };
};

export const transactionAssistant = new TransactionAssistant();