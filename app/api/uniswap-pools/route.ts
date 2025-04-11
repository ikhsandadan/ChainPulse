/* eslint-disable @typescript-eslint/no-explicit-any */
export async function POST(req: Request) {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
    }
    try {
        // Updated URL to The Graph's hosted service
        const UNISWAP_SUBGRAPH_URL = 'https://gateway.thegraph.com/api/4f09069a5d1f3e327c8df1410535fa8d/subgraphs/id/5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV';
        const body = await req.json();
        const { query } = body;
        
        const response = await fetch(UNISWAP_SUBGRAPH_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query }),
            // Add timeout configuration
            signal: AbortSignal.timeout(30000)
        });

        if (!response.ok) {
            throw new Error(`Subgraph request failed with status ${response.status}: ${await response.text()}`);
        }
        
        const data = await response.json();
        return new Response(JSON.stringify(data), { 
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    } catch (error: any) {
        console.error('Error fetching Uniswap subgraph:', error);
        
        // Improved error handling with more specific status codes
        const status = error.name === 'AbortError' ? 504 : 500;
        const message = error.name === 'AbortError' 
            ? 'Connection to Uniswap subgraph timed out' 
            : `Failed to fetch Uniswap subgraph data: ${error.message}`;
            
        return new Response(JSON.stringify({ error: message }), { 
            status,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
};