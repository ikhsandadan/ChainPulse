import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ChainPulse",
  description: "A powerful blockchain explorer that provides comprehensive visibility",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}

        <footer className="bg-gray-200 text-black py-8">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-16 place-items-end">
              <div>
                <h3 className="text-lg font-semibold mb-4">ChainPulse</h3>
                <p className="text-gray-400">
                A powerful blockchain explorer that provides comprehensive visibility into PYUSD token movements, trading pairs, and market performance. Monitor transaction trends, analyze gas costs, explore liquidity pools, and track cross-chain activity with an intelligent transaction assistant to help navigate the data.
                </p>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-4">Resources</h3>
                <ul className="space-y-2">
                  <li>
                    <a href="https://cloud.google.com/web3/docs" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-400">
                      Google Cloud Web3 Docs
                    </a>
                  </li>
                  <li>
                    <a href="https://paxos.com/pyusd/" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-400">
                      PYUSD Documentation
                    </a>
                  </li>
                  <li>
                    <a href="https://ethereum.org/developers/docs" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-400">
                      Ethereum Docs
                    </a>
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="mt-8 pt-8 border-t border-gray-700 text-center text-gray-400">
              <p>Made for Google Cloud Web3 & PayPal Hackathon by @Nashki</p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
};
