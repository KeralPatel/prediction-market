import type { Metadata } from "next";
import "./globals.css";
import { WalletProvider } from "@/context/WalletContext";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title:       "PredictX – Decentralized Prediction Markets",
  description: "Bet on real-world events. Earn from your knowledge.",
  openGraph: {
    title:       "PredictX",
    description: "Decentralized prediction markets on BNB Chain",
    type:        "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <WalletProvider>
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {children}
            </main>
            <footer className="border-t border-[#2a3450] mt-16 py-8 text-center text-[#546e8a] text-sm">
              <p>PredictX — Decentralized Prediction Markets on BNB Chain</p>
            </footer>
          </div>
        </WalletProvider>
      </body>
    </html>
  );
}
