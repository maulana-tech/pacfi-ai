import { Context } from 'hono';

export interface WalletContext {
  walletAddress: string;
  signature?: string;
  timestamp?: number;
}

export function isValidWalletAddress(address: string): boolean {
  return /^[1-9A-HJ-NP-Z]{32,44}$/.test(address);
}

export function getWalletContext(c: Context): WalletContext | null {
  const walletAddress = c.req.header('X-Wallet-Address');
  const signature = c.req.header('X-Signature');
  const timestamp = c.req.header('X-Timestamp');

  if (!walletAddress || !isValidWalletAddress(walletAddress)) {
    return null;
  }

  return {
    walletAddress,
    signature: signature ?? undefined,
    timestamp: timestamp ? parseInt(timestamp) : undefined,
  };
}

export function requireWallet() {
  return async (c: Context, next: any) => {
    const walletContext = getWalletContext(c);

    if (!walletContext) {
      return c.json(
        { error: 'Wallet not connected', message: 'Please provide X-Wallet-Address header' },
        401
      );
    }

    c.set('walletContext', walletContext);
    await next();
  };
}

export function isTimestampValid(timestamp: number, windowMs: number = 30000): boolean {
  return Math.abs(Date.now() - timestamp) <= windowMs;
}
