"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import WalletButton from "./WalletButton";
import { useWallet } from "@/context/WalletContext";
import clsx from "clsx";

const NAV_LINKS = [
  { href: "/",          label: "Markets"   },
  { href: "/create",    label: "Create"    },
  { href: "/portfolio", label: "Portfolio" },
];

export default function Header() {
  const pathname = usePathname();
  const { wrongNetwork } = useWallet();

  return (
    <>
      {wrongNetwork && (
        <div className="bg-red-500/10 border-b border-red-500/20 text-red-400 text-sm text-center py-2 px-4">
          Wrong network detected. Please switch to the correct network in your wallet.
        </div>
      )}

      <header className="sticky top-0 z-40 border-b border-[#2a3450] bg-[#0f1117]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 font-bold text-lg">
            <span className="text-2xl">◈</span>
            <span className="text-gradient">Knightsbridge</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  pathname === href
                    ? "bg-brand-600/20 text-brand-400"
                    : "text-[#8892b0] hover:text-[#e8eaf6] hover:bg-[#1a2035]"
                )}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Wallet */}
          <WalletButton />
        </div>

        {/* Mobile nav */}
        <div className="md:hidden border-t border-[#2a3450] flex">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex-1 text-center py-2 text-sm font-medium transition-colors",
                pathname === href
                  ? "text-brand-400 border-b-2 border-brand-400"
                  : "text-[#8892b0]"
              )}
            >
              {label}
            </Link>
          ))}
        </div>
      </header>
    </>
  );
}
