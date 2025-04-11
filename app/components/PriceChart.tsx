/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

interface ChartDataPoint {
    timestamp: number;
    price: number;
    volume: number;
};

interface PriceChartProps {
    prices: number[][];
    total_volumes: number[][];
};

const PriceChart: React.FC<PriceChartProps> = ({ prices, total_volumes }) => {
    const chartData: ChartDataPoint[] = prices?.map((pricePoint, index) => ({
        timestamp: pricePoint[0],
        price: pricePoint[1],
        volume: total_volumes[index][1]
    }));

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-gray-800 p-4 rounded shadow-lg">
                    <p className="text-white">
                        {format(new Date(data.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                    </p>
                    <p className="text-blue-300">Price: ${data.price.toFixed(4)}</p>
                    <p className="text-green-300">Volume: ${data.volume.toLocaleString()}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="w-full h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
            <LineChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
            <XAxis 
                dataKey="timestamp" 
                tickFormatter={(timestamp) => format(new Date(timestamp), 'MMM dd')}
                className="text-white"
            />
            <YAxis 
                domain={['dataMin', 'dataMax']} 
                tickFormatter={(value) => `$${value.toFixed(4)}`}
                className="text-white"
            />
            <Tooltip content={<CustomTooltip />} />
            <Line 
                type="monotone" 
                dataKey="price" 
                stroke="#FF0000" 
                dot={false} 
                strokeWidth={2} 
            />
            </LineChart>
        </ResponsiveContainer>
        </div>
    );
};

export default PriceChart;