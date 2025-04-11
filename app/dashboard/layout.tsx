import React, { ReactNode } from 'react';
import Head from 'next/head';

interface LayoutProps {
    children: ReactNode;
};

export default function Layout({ children }: LayoutProps) {
    return (
        <div className="min-h-screen text-black">
            <Head>
                <title>Blockchain Dashboard - Network Congestion & PYUSD</title>
                <meta name="description" content="Dashboard for monitoring blockchain network congestion and PYUSD transaction flow" />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            
            <main className="mx-auto px-8 pb-2">
                {children}
            </main>
        </div>
    );
};