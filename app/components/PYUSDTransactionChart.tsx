/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface TransactionData {
    block: number;
    count: number;
    gasUsed: number;
};

interface PYUSDTransactionChartProps {
    data: TransactionData[] | undefined;
};

export default function PYUSDTransactionChart({ data }: PYUSDTransactionChartProps) {
    const sortedData = data ? [...data].sort((a, b) => a.block - b.block) : [];

    const chartData = {
        labels: sortedData.map(d => d.block),
        datasets: [
            {
                label: 'Transactions Count',
                data: sortedData.map(d => d.count),
                borderColor: '#82ca9d',
                backgroundColor: 'rgba(130, 202, 157, 0.5)',
                borderWidth: 2,
                tension: 0.3,
            },
            {
                label: 'Gas Used',
                data: sortedData.map(d => d.gasUsed),
                borderColor: '#8884d8',
                backgroundColor: 'rgba(136, 132, 216, 0.5)',
                borderWidth: 2,
                tension: 0.3,
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top' as const,
            },
            tooltip: {
                callbacks: {
                    label: function (tooltipItem: any) {
                        const dataIndex = tooltipItem.dataIndex;
                        const transactionCount = sortedData[dataIndex]?.count ?? 0;
                        const gasUsed = sortedData[dataIndex]?.gasUsed ?? 0;

                        return [
                            `Transactions Count: ${transactionCount}`,
                            `Gas Used: ${gasUsed.toLocaleString('en-US')}`
                        ];
                    },
                },
            },
        },
        scales: {
            x: {
                title: {
                    display: true,
                    text: 'Block Number',
                },
            },
            y: {
                title: {
                    display: true,
                    text: 'Count / Gas Used',
                },
            },
        },
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-lg font-semibold text-gray-900">
                PYUSD Transaction Trends (Last 10 Blocks)
            </h2>
            <div className="h-[400px]">
                <Line data={chartData} options={chartOptions} />
            </div>
        </div>
    );
};