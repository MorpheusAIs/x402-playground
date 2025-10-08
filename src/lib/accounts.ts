import { CdpClient, type EvmServerAccount } from "@coinbase/cdp-sdk";
import { base, baseSepolia } from "viem/chains";
import { env } from "./env";

// Create the CDP client instance
// The constructor will automatically use CDP_API_KEY_ID, CDP_API_KEY_SECRET,
// and CDP_WALLET_SECRET from environment variables if not provided
const cdp = new CdpClient({
  apiKeyId: env.CDP_API_KEY_ID,
  apiKeySecret: env.CDP_API_KEY_SECRET,
  walletSecret: env.CDP_WALLET_SECRET,
});

// Get the chain configuration based on the network
export const chain = env.NETWORK === "base" ? base : baseSepolia;

// Cache for accounts to avoid recreating them on every request
let sellerAccountCache: EvmServerAccount | null = null;
let purchaserAccountCache: EvmServerAccount | null = null;

/**
 * Get or create the seller account
 * The seller account receives payments for protected content
 */
export async function getOrCreateSellerAccount() {
  if (sellerAccountCache) {
    return sellerAccountCache;
  }

  // Get or create an account with a specific name
  // This ensures we always get the same seller account
  sellerAccountCache = await cdp.evm.getOrCreateAccount({
    name: "seller-account",
  });

  return sellerAccountCache;
}

/**
 * Get or create the purchaser account
 * The purchaser account pays for tools and protected content
 */
export async function getOrCreatePurchaserAccount() {
  if (purchaserAccountCache) {
    return purchaserAccountCache;
  }

  // Get or create an account with a specific name
  // This ensures we always get the same purchaser account
  purchaserAccountCache = await cdp.evm.getOrCreateAccount({
    name: "purchaser-account",
  });

  // Request testnet funds if on testnet
  if (env.NETWORK === "base-sepolia") {
    try {
      await cdp.evm.requestFaucet({
        address: purchaserAccountCache.address,
        network: "base-sepolia",
        token: "eth",
      });
      console.log("Requested testnet ETH for purchaser account");

      // Also request USDC for testnet
      await cdp.evm.requestFaucet({
        address: purchaserAccountCache.address,
        network: "base-sepolia",
        token: "usdc",
      });
      console.log("Requested testnet USDC for purchaser account");
    } catch (error) {
      console.warn("Could not request testnet funds:", error);
    }
  }

  return purchaserAccountCache;
}
