"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { ethers } from "ethers";
import { CHAIN_ID } from "@/lib/config";

// ─── Types ────────────────────────────────────────────────────────────────

interface WalletContextValue {
  address:      string | null;
  chainId:      number | null;
  isConnected:  boolean;
  isConnecting: boolean;
  wrongNetwork: boolean;
  provider:     ethers.BrowserProvider | null;
  signer:       ethers.JsonRpcSigner   | null;

  connectWallet:    () => Promise<void>;
  disconnectWallet: () => void;
  getSigner:        () => Promise<ethers.JsonRpcSigner | null>;
  getProvider:      () => ethers.BrowserProvider | null;
}

// ─── Context ──────────────────────────────────────────────────────────────

const WalletContext = createContext<WalletContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address,      setAddress]      = useState<string | null>(null);
  const [chainId,      setChainId]      = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [provider,     setProvider]     = useState<ethers.BrowserProvider | null>(null);
  const [signer,       setSigner]       = useState<ethers.JsonRpcSigner | null>(null);

  const providerRef = useRef<ethers.BrowserProvider | null>(null);

  const isConnected  = !!address;
  const wrongNetwork = !!chainId && chainId !== CHAIN_ID;

  // ── Helpers ──────────────────────────────────────────────────────────────

  const getProvider = useCallback((): ethers.BrowserProvider | null => {
    return providerRef.current;
  }, []);

  const getSigner = useCallback(async (): Promise<ethers.JsonRpcSigner | null> => {
    if (!providerRef.current) return null;
    try {
      return await providerRef.current.getSigner();
    } catch {
      return null;
    }
  }, []);

  const updateConnection = useCallback(async (ethProvider: ethers.BrowserProvider) => {
    try {
      const network = await ethProvider.getNetwork();
      const signerObj = await ethProvider.getSigner();
      const addr      = await signerObj.getAddress();

      providerRef.current = ethProvider;
      setProvider(ethProvider);
      setSigner(signerObj);
      setAddress(addr);
      setChainId(Number(network.chainId));
    } catch (err) {
      console.error("updateConnection error:", err);
    }
  }, []);

  // ── Connect ───────────────────────────────────────────────────────────────

  const connectWallet = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      alert("MetaMask (or compatible wallet) not detected. Please install MetaMask.");
      return;
    }

    setIsConnecting(true);
    try {
      const ethProvider = new ethers.BrowserProvider(window.ethereum as ethers.Eip1193Provider);
      // Request account access
      await ethProvider.send("eth_requestAccounts", []);
      await updateConnection(ethProvider);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      // User rejected request
      if (msg.includes("4001") || msg.includes("user rejected")) return;
      console.error("connectWallet error:", err);
    } finally {
      setIsConnecting(false);
    }
  }, [updateConnection]);

  // ── Disconnect ────────────────────────────────────────────────────────────

  const disconnectWallet = useCallback(() => {
    providerRef.current = null;
    setProvider(null);
    setSigner(null);
    setAddress(null);
    setChainId(null);
  }, []);

  // ── Auto-connect if previously connected ─────────────────────────────────

  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) return;

    const tryAutoConnect = async () => {
      try {
        const ethProvider = new ethers.BrowserProvider(window.ethereum as ethers.Eip1193Provider);
        // Check if accounts are already exposed (no popup)
        const accounts: string[] = await ethProvider.send("eth_accounts", []);
        if (accounts.length > 0) {
          await updateConnection(ethProvider);
        }
      } catch {
        // Silently fail – user hasn't connected yet
      }
    };

    tryAutoConnect();
  }, [updateConnection]);

  // ── Listen for wallet events ──────────────────────────────────────────────

  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) return;

    const handleAccountsChanged = async (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else {
        if (providerRef.current) {
          const newSigner = await providerRef.current.getSigner();
          setSigner(newSigner);
          setAddress(accounts[0]);
        }
      }
    };

    const handleChainChanged = (chainIdHex: string) => {
      const newChainId = parseInt(chainIdHex, 16);
      setChainId(newChainId);
      // Re-create provider after chain change
      if (providerRef.current) {
        const newProvider = new ethers.BrowserProvider(window.ethereum as ethers.Eip1193Provider);
        providerRef.current = newProvider;
        setProvider(newProvider);
        newProvider.getSigner().then((s) => setSigner(s)).catch(() => {});
      }
    };

    const handleDisconnect = () => {
      disconnectWallet();
    };

    const onAccountsChanged = (...args: unknown[]) => handleAccountsChanged(args[0] as string[]);
    const onChainChanged    = (...args: unknown[]) => handleChainChanged(args[0] as string);
    const onDisconnect      = () => handleDisconnect();

    window.ethereum.on("accountsChanged", onAccountsChanged);
    window.ethereum.on("chainChanged", onChainChanged);
    window.ethereum.on("disconnect", onDisconnect);

    return () => {
      window.ethereum?.removeListener("accountsChanged", onAccountsChanged);
      window.ethereum?.removeListener("chainChanged", onChainChanged);
      window.ethereum?.removeListener("disconnect", onDisconnect);
    };
  }, [disconnectWallet]);

  return (
    <WalletContext.Provider
      value={{
        address,
        chainId,
        isConnected,
        isConnecting,
        wrongNetwork,
        provider,
        signer,
        connectWallet,
        disconnectWallet,
        getSigner,
        getProvider,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside WalletProvider");
  return ctx;
}

// ─── Global window.ethereum type augmentation ─────────────────────────────

declare global {
  interface Window {
    ethereum?: {
      request:       (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      send:          (method: string, params: unknown[]) => Promise<unknown>;
      on:            (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener:(event: string, handler: (...args: unknown[]) => void) => void;
      isMetaMask?:   boolean;
    };
  }
}
