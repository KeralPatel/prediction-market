import type { Metadata } from "next";
import "./globals.css";
import { WalletProvider } from "@/context/WalletContext";
import Header from "@/components/Header";
import TickerWrapper from "@/components/TickerWrapper";

export const metadata: Metadata = {
  title:       "Knightsbridge – Decentralised Prediction Markets",
  description: "Trade on the outcomes that move markets. Every position settled on-chain.",
  openGraph: {
    title:       "Knightsbridge",
    description: "Decentralised prediction markets on BNB Chain",
    type:        "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <WalletProvider>
          <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
            <TickerWrapper />
            <Header />
            <main style={{ flex: 1, maxWidth: 1400, width: "100%", margin: "0 auto", padding: "40px 24px" }}>
              {children}
            </main>
            <footer style={{ borderTop: "1px solid #1e293b", marginTop: 64, padding: "24px", textAlign: "center", color: "#475569", fontSize: 13 }}>
              Knightsbridge · Decentralised Prediction Markets · BNB Chain
            </footer>
          </div>
        </WalletProvider>
      </body>
    </html>
  );
}
