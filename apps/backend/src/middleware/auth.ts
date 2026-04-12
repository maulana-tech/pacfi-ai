// Wallet-based authentication
// No JWT needed - wallet address is passed in request headers

export interface WalletContext {
  walletAddress: string;
  signature?: string;
  timestamp?: number;
}

/**
 * Extract wallet address from request
 * Wallet address is passed in X-Wallet-Address header
 */
export const getWalletAddress = (c: any): string | null => {
  return c.req.header('X-Wallet-Address') || null;
};

/**
 * Validate wallet address format (Solana address)
 * Solana addresses are base58 encoded, 32-44 characters
 */
export const isValidWalletAddress = (address: string): boolean => {
  // Basic Solana address validation
  return /^[1-9A-HJ-NP-Z]{32,44}$/.test(address);
};

/**
 * Extract signature from request for order verification
 */
export const getSignature = (c: any): string | null => {
  return c.req.header('X-Signature') || null;
};

/**
 * Get wallet context from request
 */
export const getWalletContext = (c: any): WalletContext | null => {
  const walletAddress = getWalletAddress(c);
  const signature = getSignature(c);
  const timestampHeader = c.req.header('X-Timestamp');
  const timestamp = timestampHeader ? Number.parseInt(timestampHeader, 10) : undefined;

  if (!walletAddress || !isValidWalletAddress(walletAddress)) {
    return null;
  }

  return {
    walletAddress,
    signature: signature ?? undefined,
    timestamp: Number.isFinite(timestamp) ? timestamp : undefined,
  };
};
