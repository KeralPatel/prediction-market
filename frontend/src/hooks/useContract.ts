import { useMemo } from "react";
import { ethers } from "ethers";
import { MARKET_FACTORY_ABI, ERC20_ABI } from "@/lib/abi";
import { CONTRACT_ADDRESS, TOKEN_ADDRESS, RPC_URL } from "@/lib/config";
import { useWallet } from "@/context/WalletContext";

// ─── Read-only provider (no wallet needed) ─────────────────────────────────

function getReadProvider(): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(RPC_URL);
}

// ─── Hook: Market Factory contract ─────────────────────────────────────────

/**
 * Returns read-only and write (signed) instances of the MarketFactory contract.
 */
export function useFactoryContract() {
  const { signer, isConnected } = useWallet();

  const readContract = useMemo(() => {
    if (!CONTRACT_ADDRESS) return null;
    return new ethers.Contract(CONTRACT_ADDRESS, MARKET_FACTORY_ABI, getReadProvider());
  }, []);

  const writeContract = useMemo(() => {
    if (!CONTRACT_ADDRESS || !signer || !isConnected) return null;
    return new ethers.Contract(CONTRACT_ADDRESS, MARKET_FACTORY_ABI, signer);
  }, [signer, isConnected]);

  return { readContract, writeContract };
}

// ─── Hook: ERC20 Token contract ─────────────────────────────────────────────

/**
 * Returns read-only and write instances of the betting token contract.
 */
export function useTokenContract(tokenAddress?: string) {
  const { signer, isConnected } = useWallet();
  const addr = tokenAddress || TOKEN_ADDRESS;

  const readContract = useMemo(() => {
    if (!addr) return null;
    return new ethers.Contract(addr, ERC20_ABI, getReadProvider());
  }, [addr]);

  const writeContract = useMemo(() => {
    if (!addr || !signer || !isConnected) return null;
    return new ethers.Contract(addr, ERC20_ABI, signer);
  }, [addr, signer, isConnected]);

  return { readContract, writeContract };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Ensure the user has sufficient token allowance for `spender`.
 * Calls approve() if needed and waits for the tx.
 */
export async function ensureAllowance(
  tokenWrite: ethers.Contract,
  owner:       string,
  spender:     string,
  amount:      bigint
): Promise<void> {
  const current: bigint = await (tokenWrite as ethers.Contract & {
    allowance: (o: string, s: string) => Promise<bigint>;
  }).allowance(owner, spender);

  if (current >= amount) return;

  const tx = await tokenWrite.approve(spender, ethers.MaxUint256);
  await tx.wait();
}
