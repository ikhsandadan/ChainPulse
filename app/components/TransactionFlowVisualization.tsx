/* eslint-disable @typescript-eslint/no-explicit-any */
import { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { ethers } from 'ethers';
import { TransactionFlow, InternalTransaction } from '../types';

interface Props {
    flow: TransactionFlow;
};

interface NodeDatum extends d3.SimulationNodeDatum {
    id: string;
    type: string;
    data: any;
    label: string;
};

interface LinkDatum extends d3.SimulationLinkDatum<NodeDatum> {
    type: string;
    value?: string;
    label?: string;
    isSource?: boolean;
    index?: number;
};

export default function TransactionFlowVisualization({ flow }: Props) {
    const svgRef = useRef<SVGSVGElement>(null);
    const [showInternalTx, setShowInternalTx] = useState(true);
    const [showTokenTransfers, setShowTokenTransfers] = useState(true);
    
    useEffect(() => {
        if (!svgRef.current) return;
        
        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();
        
        // Create nodes for transactions and tokens
        const nodes: NodeDatum[] = [];
        const links: LinkDatum[] = [];
        
        // Add the main transaction
        nodes.push({
            id: flow.hash,
            type: 'transaction',
            data: flow.transactions[0],
            label: 'Main TX'
        });
        
        // Add from and to addresses as nodes
        const mainTx = flow.transactions[0];
        nodes.push({
            id: mainTx.from,
            type: 'address',
            data: { address: mainTx.from },
            label: `From: ${mainTx.from.substring(0, 6)}...${mainTx.from.substring(mainTx.from.length - 4)}`
        });
        
        if (mainTx.to) {
            const isContract = flow.internalTransactions && flow.internalTransactions.length > 0;
            
            nodes.push({
                id: mainTx.to,
                type: isContract ? 'contract' : 'address',
                data: { address: mainTx.to },
                label: `${isContract ? 'Contract: ' : 'To: '}${mainTx.to.substring(0, 6)}...${mainTx.to.substring(mainTx.to.length - 4)}`
            });
            
            // Add link from main transaction to 'to' address
            links.push({
                source: flow.hash,
                target: mainTx.to,
                value: mainTx.value,
                type: 'ether',
                label: `${mainTx.value} ETH`
            });
        }
        
        // Add link from 'from' address to main transaction
        links.push({
            source: mainTx.from,
            target: flow.hash,
            value: '0',
            type: 'call',
            label: 'calls'
        });
        
        if (showInternalTx && flow.internalTransactions && flow.internalTransactions.length > 0) {
            
            flow.internalTransactions.forEach((tx: InternalTransaction, index) => {
                if (!nodes.some(n => n.id === tx.from) && tx.from !== mainTx.from && tx.from !== mainTx.to) {
                    nodes.push({
                        id: tx.from,
                        type: 'address',
                        data: { address: tx.from },
                        label: `Addr: ${tx.from.substring(0, 6)}...${tx.from.substring(tx.from.length - 4)}`
                    });
                }
                
                if (!nodes.some(n => n.id === tx.to) && tx.to !== mainTx.from && tx.to !== mainTx.to) {
                    nodes.push({
                        id: tx.to,
                        type: 'contract',
                        data: { address: tx.to },
                        label: `Contract: ${tx.to.substring(0, 6)}...${tx.to.substring(tx.to.length - 4)}`
                    });
                }
                
                const internalTxId = `internal_${index}`;
                
                if (tx.depth > 0) {
                    nodes.push({
                        id: internalTxId,
                        type: 'internalTx',
                        data: tx,
                        label: `Call ${tx.callType}`
                    });
                    
                    links.push({
                        source: tx.from,
                        target: internalTxId,
                        type: 'internal',
                        label: tx.callType
                    });
                    
                    links.push({
                        source: internalTxId,
                        target: tx.to,
                        type: 'internal',
                        value: tx.value,
                        label: tx.value !== '0' ? `${tx.value} ETH` : tx.callType
                    });
                } else {
                    links.push({
                        source: tx.from,
                        target: tx.to,
                        type: 'internal',
                        value: tx.value,
                        label: tx.value !== '0' ? `${tx.value} ETH` : tx.callType
                    });
                }
            });
        }
        
        if (showTokenTransfers && flow.tokens.length > 0) {
            flow.tokens.forEach(token => {
                nodes.push({
                    id: token.address,
                    type: 'token',
                    data: token,
                    label: token.symbol
                });
            });
            
            let tokenTransferIndex = 0;
            if (flow.eventLogs) {
                flow.eventLogs.forEach(log => {
                    if (log.eventType === 'ERC20 Transfer' && log.decoded) {
                        const token = flow.tokens.find(t => t.address.toLowerCase() === log.address.toLowerCase());
                        if (token) {
                            if (!nodes.some(n => n.id === log.decoded.from)) {
                                nodes.push({
                                    id: log.decoded.from,
                                    type: 'address',
                                    data: { address: log.decoded.from },
                                    label: `Addr: ${log.decoded.from.substring(0, 6)}...${log.decoded.from.substring(log.decoded.from.length - 4)}`
                                });
                            }
                            
                            if (!nodes.some(n => n.id === log.decoded.to)) {
                                nodes.push({
                                    id: log.decoded.to,
                                    type: 'address',
                                    data: { address: log.decoded.to },
                                    label: `Addr: ${log.decoded.to.substring(0, 6)}...${log.decoded.to.substring(log.decoded.to.length - 4)}`
                                });
                            }
                            
                            links.push({
                                source: log.decoded.from,
                                target: token.address,
                                type: 'token_transfer',
                                label: 'sends',
                                isSource: true,
                                index: tokenTransferIndex
                            });
                            
                            links.push({
                                source: token.address,
                                target: log.decoded.to,
                                type: 'token_transfer',
                                label: `${parseFloat(ethers.formatUnits(log.decoded.value, token.decimals)).toLocaleString('en-US', { 
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 2
                                })} ${token.symbol}`,
                                isSource: false,
                                index: tokenTransferIndex
                            });
                            
                            tokenTransferIndex++;
                        }
                    }
                });
            }
        }
        
        // Set up force simulation
        const width = 800;
        const height = 600;

        function getCollisionRadius(node: NodeDatum): number {
            if (node.type === 'transaction') {
                return 40;
            } else if (node.type === 'contract') {
                return 35;
            }
            return 30;
        }        
        
        const simulation = d3.forceSimulation<NodeDatum>(nodes)
            .force('link', 
                d3.forceLink<NodeDatum, LinkDatum>(links)
                    .id(d => d.id)
                    .distance((d: LinkDatum) => {
                        // Increase the distance between nodes for longer lines
                        const source = d.source as NodeDatum;
                        const target = d.target as NodeDatum;
                        if (source.type === 'transaction' || target.type === 'transaction') {
                            return 250;
                        }
                        return 180;
                    })
            )
            .force('charge', d3.forceManyBody().strength(-800)) // Increased repulsion force
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide<NodeDatum>()
                .radius(getCollisionRadius)
                .strength(1) // Increased collision strength
            );
        
        // Create SVG elements
        const container = svg
            .attr('width', width)
            .attr('height', height)
            .attr('viewBox', [0, 0, width, height]);
        
        // Zoom functionality
        const zoom = d3.zoom()
            .scaleExtent([0.1, 3])
            .on('zoom', (event) => {
                g.attr('transform', event.transform);
            });
        
        svg.call(zoom as any);
        
        const g = container.append('g');
        
        // Define arrow markers for links - Now with completely standardized sizing
        const defs = g.append('defs');
        
        const arrowMarkerSize = 5;
        const arrowRefX = 9;
        
        // Different arrow types with consistent sizing
        const arrowTypes = [
            { id: 'arrow-ether', color: '#4299e1' },
            { id: 'arrow-call', color: '#805ad5' },
            { id: 'arrow-internal', color: '#718096' },
            { id: 'arrow-token_transfer', color: '#ed8936' }
        ];
        
        arrowTypes.forEach(arrow => {
            defs.append('marker')
                .attr('id', arrow.id)
                .attr('viewBox', '0 -5 10 10')
                .attr('refX', arrowRefX)
                .attr('refY', 0)
                .attr('markerWidth', arrowMarkerSize)
                .attr('markerHeight', arrowMarkerSize)
                .attr('orient', 'auto')
                .append('path')
                .attr('fill', arrow.color)
                .attr('d', 'M0,-5L10,0L0,5'); // Standard arrow shape
        });

        function drag(simulation: d3.Simulation<NodeDatum, undefined>) {
            function dragstarted(event: d3.D3DragEvent<SVGGElement, NodeDatum, NodeDatum>) {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                event.subject.fx = event.subject.x;
                event.subject.fy = event.subject.y;
            }
    
            function dragged(event: d3.D3DragEvent<SVGGElement, NodeDatum, NodeDatum>) {
                event.subject.fx = event.x;
                event.subject.fy = event.y;
            }
    
            function dragended(event: d3.D3DragEvent<SVGGElement, NodeDatum, NodeDatum>) {
                if (!event.active) simulation.alphaTarget(0);
                event.subject.fx = null;
                event.subject.fy = null;
            }
    
            return d3.drag<SVGGElement, NodeDatum, any>()
                .on('start', dragstarted)
                .on('drag', dragged)
                .on('end', dragended);
        }
        
        const link = g.append('g')
            .selectAll('line')
            .data(links)
            .join('path')
            .attr('stroke', d => {
                switch(d.type) {
                    case 'ether': return '#4299e1';
                    case 'call': return '#805ad5';
                    case 'internal': return '#718096';
                    case 'token_transfer': return '#ed8936';
                    default: return '#999';
                }
            })
            .attr('stroke-opacity', 0.6)
            .attr('stroke-width', 2)
            .attr('marker-end', d => `url(#arrow-${d.type})`)
            .attr('fill', 'none');
        
        link.attr('stroke-width', d => {
            if (d.value && parseFloat(d.value) > 0) {
                // More conservative scaling function with a lower maximum
                return Math.min(Math.sqrt(parseFloat(d.value) * 10) + 1, 5);
            }
            return 2;
        });
        
        // Add link labels with adjusted positions for token transfers
        const linkText = g.append('g')
            .selectAll('text')
            .data(links)
            .join('text')
            .attr('font-size', 10)
            .attr('font-weight', 'bold')
            .attr('text-anchor', 'middle')
            .text(d => d.label || '');
        
        linkText
            .attr('fill', '#333')
            .attr('stroke', '#fff')
            .attr('stroke-width', 0.5)
            .attr('paint-order', 'stroke');
        
        const node = g.append('g')
            .selectAll<SVGGElement, NodeDatum>('g')
            .data(nodes)
            .join('g')
            .call(drag(simulation));
        
        // Node circles
        node.append('circle')
            .attr('r', d => {
                switch(d.type) {
                    case 'transaction': return 25;
                    case 'contract': return 20;
                    case 'token': return 20;
                    case 'internalTx': return 20;
                    default: return 15;
                }
            })
            .attr('fill', d => {
                switch(d.type) {
                    case 'transaction': return '#4299e1';
                    case 'address': return '#48bb78';
                    case 'contract': return '#805ad5';
                    case 'token': return '#f6ad55';
                    case 'internalTx': return '#718096';
                    default: return '#999';
                }
            })
            .attr('stroke', '#fff')
            .attr('stroke-width', 2);
        
        // Node icons (simpel teks sebagai icon)
        node.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '0.3em')
            .attr('fill', 'white')
            .attr('font-size', 10)
            .text(d => {
                switch(d.type) {
                case 'transaction': return 'TX';
                case 'address': return 'A';
                case 'contract': return 'C';
                case 'token': return 'T';
                case 'internalTx': return 'I';
                default: return '';
                }
            });
        
        // Node labels with improved visibility
        node.append('text')
            .attr('font-size', 12)
            .attr('dy', 35)
            .attr('text-anchor', 'middle')
            .attr('fill', '#333')
            .attr('stroke', '#fff')
            .attr('stroke-width', 0.5)
            .attr('paint-order', 'stroke')
            .text(d => d.label || '');

        node.append('title')
            .text(d => `${d.label}\n${JSON.stringify(d.data, (key, value) => {
                if (typeof value === 'bigint') {
                    return Number(value);
                }
                return value;
            }, 2)}`);      
        
        link.append('title')
            .text(d => `${d.label}\nValue: ${d.value}`);
        
        // Group token transfers by source and target nodes to avoid overlap
        const getTokenLinkKey = (d: LinkDatum) => {
            const source = d.source as NodeDatum;
            const target = d.target as NodeDatum;
            return `${source.id}-${target.id}`;
        };
        
        // Count token transfers between same nodes
        const tokenLinkCounts = new Map<string, number>();
        const tokenLinkIndexes = new Map<string, number[]>();
        
        links.forEach(d => {
            if (d.type === 'token_transfer') {
                const key = getTokenLinkKey(d);
                const count = tokenLinkCounts.get(key) || 0;
                tokenLinkCounts.set(key, count + 1);
                
                // Store indexes for each token link
                const indexes = tokenLinkIndexes.get(key) || [];
                if (d.index !== undefined) {
                    indexes.push(d.index);
                    tokenLinkIndexes.set(key, indexes);
                }
            }
        });
        
        function getNodeRadius(nodeType: string): number {
            switch(nodeType) {
                case 'transaction': return 25;
                case 'contract': return 20;
                case 'token': return 20;
                case 'internalTx': return 20;
                default: return 15;
            }
        }
        
        simulation.on('tick', () => {
            // Generate paths with consistent positioning for all link types
            link.attr('d', d => {
                // Type assertion for source and target
                const source = d.source as NodeDatum;
                const target = d.target as NodeDatum;
                
                // Use standardized node radius function
                const sourceRadius = getNodeRadius(source.type);
                const targetRadius = getNodeRadius(target.type);
                
                const dx = target.x! - source.x!;
                const dy = target.y! - source.y!;
                const dr = Math.sqrt(dx * dx + dy * dy);
                
                // Calculate the start and end points, taking into account node sizes
                const angle = Math.atan2(dy, dx);
                
                const startX = source.x! + sourceRadius * Math.cos(angle);
                const startY = source.y! + sourceRadius * Math.sin(angle);
                
                const arrowPadding = 8;
                const endX = target.x! - (targetRadius + arrowPadding) * Math.cos(angle);
                const endY = target.y! - (targetRadius + arrowPadding) * Math.sin(angle);
                
                // Standardized curvature for all link types - reduced slightly
                const curvature = 0.8;
                
                return `M${startX},${startY}A${dr * curvature},${dr * curvature} 0 0,1 ${endX},${endY}`;
            });
            
            // Modified label positioning for token transfers to avoid overlap
            linkText.attr('x', d => {
                const source = d.source as NodeDatum;
                const target = d.target as NodeDatum;
                
                // For token transfers, offset the position differently based on whether it's source or target
                if (d.type === 'token_transfer') {
                    const dx = target.x! - source.x!;

                    // Get the key for this token link
                    const key = getTokenLinkKey(d);
                    const indexes = tokenLinkIndexes.get(key) || [];
                    
                    // Calculate position based on how many token transfers exist between these nodes
                    if (d.isSource) {
                        return source.x! + (dx * 0.25);
                    } else {
                        // Calculate index of this token transfer among the transfers between these nodes
                        const linkIndex = d.index !== undefined ? indexes.indexOf(d.index) : 0;
                        
                        const xOffset = 0.65 + (linkIndex * 0.08);
                        return source.x! + (dx * xOffset);
                    }
                }
                
                // For other link types, keep the standard midpoint
                return (source.x! + target.x!) / 2;
            })
            .attr('y', d => {
                const source = d.source as NodeDatum;
                const target = d.target as NodeDatum;
                
                // For token transfers, offset the position differently based on whether it's source or target
                if (d.type === 'token_transfer') {
                    const dy = target.y! - source.y!;
                    
                    // Get the key for this token link
                    const key = getTokenLinkKey(d);
                    const indexes = tokenLinkIndexes.get(key) || [];
                    
                    if (d.isSource) {
                        return source.y! + (dy * 0.25) - 15;
                    } else {
                        // Calculate index of this token transfer among the transfers between these nodes
                        const linkIndex = d.index !== undefined ? indexes.indexOf(d.index) : 0;
                        
                        const baseY = source.y! + (dy * 0.75);
                        const offset = 5 + (linkIndex * 15);
                        
                        return baseY + offset;
                    }
                }
                
                // For other link types, slightly offset from the line
                return ((source.y! + target.y!) / 2) - 5;
            });
            
            node.attr('transform', d => `translate(${d.x!},${d.y!})`);
        });

        return () => {
            simulation.stop();
        };
    }, [flow, showInternalTx, showTokenTransfers]);
    
    return (
        <div className="flex flex-col h-full">
            <div className="flex flex-wrap mb-4 space-x-4">
                <label className="flex items-center space-x-2">
                    <input
                        type="checkbox"
                        checked={showInternalTx}
                        onChange={(e) => setShowInternalTx(e.target.checked)}
                        className="form-checkbox h-4 w-4 cursor-pointer"
                    />
                    <span className="text-sm cursor-pointer">Show Internal Transactions</span>
                </label>
                <label className="flex items-center space-x-2">
                    <input
                        type="checkbox"
                        checked={showTokenTransfers}
                        onChange={(e) => setShowTokenTransfers(e.target.checked)}
                        className="form-checkbox h-4 w-4 cursor-pointer"
                    />
                    <span className="text-sm cursor-pointer">Show Token Transfers</span>
                </label>
            </div>
            <div className="relative flex-1 rounded-md overflow-hidden">
                <svg
                    ref={svgRef}
                    className="bg-white rounded-lg shadow-md p-1 w-full h-full"
                    style={{ minHeight: '800px' }}
                />
                <div className="absolute bottom-4 right-4 p-4 bg-gray-50 rounded-md shadow-md">
                    <h3 className="text-sm font-semibold mb-2">Legend:</h3>
                    <div className="flex flex-wrap gap-4">
                        <div className="flex items-center">
                            <div className="w-4 h-4 rounded-full mr-2" style={{ backgroundColor: '#4299e1' }}></div>
                            <span className="text-xs">Transaction</span>
                        </div>
                        <div className="flex items-center">
                            <div className="w-4 h-4 rounded-full mr-2" style={{ backgroundColor: '#48bb78' }}></div>
                            <span className="text-xs">Address</span>
                        </div>
                        <div className="flex items-center">
                            <div className="w-4 h-4 rounded-full mr-2" style={{ backgroundColor: '#805ad5' }}></div>
                            <span className="text-xs">Contract</span>
                        </div>
                        <div className="flex items-center">
                            <div className="w-4 h-4 rounded-full mr-2" style={{ backgroundColor: '#f6ad55' }}></div>
                            <span className="text-xs">Token</span>
                        </div>
                        <div className="flex items-center">
                            <div className="w-4 h-4 rounded-full mr-2" style={{ backgroundColor: '#718096' }}></div>
                            <span className="text-xs">Internal Tx</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};