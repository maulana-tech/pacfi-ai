import { Context } from 'hono';
import { PublicKey } from '@solana/web3.js';

export interface WalletContext {
  walletAddress: string;
  signature?: string;
  timestamp?: number;
}

/**
 * Validate Solana wallet address format
 */
export function isValidWalletAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract wallet context from request headers
 */
export function getWalletContext(c: Context): WalletContext | null {
  const walletAddress = c.req.header('X-Wallet-Address');
  const signature = c.req.header('X-Signature');
  const timestamp = c.req.header('X-Timestamp');

  if (!walletAddress) {
    return null;
  }

  if (!isValidWalletAddress(walletAddress)) {
    return null;
  }

  return {
    walletAddress,
    signature,
    timestamp: timestamp ? parseInt(timestamp) : undefined,
  };
}

/**
 * Middleware to require wallet connection
 */
export function requireWallet() {
  return async (c: Context, next: any) => {
    const walletContext = getWalletContext(c);

    if (!walletContext) {
      return c.json(
        {
          error: 'Wallet not connected',
          message: 'Please provide X-Wallet-Address header',
        },
        401
      );
    }

    // Store wallet context in request state
    c.set('walletContext', walletContext);

    await next();
  };
}

/**
 * Verify signature timestamp (prevent replay attacks)
 */
export function isTimestampValid(timestamp: number, windowMs: number = 30000): boolean {
  const now = Date.now();
  const diff = Math.abs(now - timestamp);
  return diff <= windowMs;
}
