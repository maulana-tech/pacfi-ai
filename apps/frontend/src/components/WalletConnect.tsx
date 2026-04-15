import React, { useState, useEffect, useCallback } from 'react';
import bs58 from 'bs58';

const isValidSolanaAddress = (address: string): boolean => {
  if (!address || address.length < 32) return false;
  return /^[1-9A-HJ-NP-Za-km-z]+$/.test(address);
};

interface WalletContextType {
  walletAddress: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => Promise<string | null>;
  disconnect: () => Promise<void>;
  signMessage: (message: string) => Promise<string>;
}

const STORAGE_KEY_ADDRESS = 'pacfi_wallet_address';

const readStoredAddress = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY_ADDRESS);
    return stored && isValidSolanaAddress(stored) ? stored : null;
  } catch {
    return null;
  }
};

export const useWalletContext = (): WalletContextType => {
  const [walletAddress, setWalletAddress] = useState<string | null>(readStoredAddress);
  const [isConnected, setIsConnected] = useState<boolean>(() => Boolean(readStoredAddress()));
  const [isConnecting, setIsConnecting] = useState(false);

  const getProvider = useCallback(() => {
    if (typeof window === 'undefined') {
      return null;
    }

    const anyWindow = window as Window & {
      phantom?: { solana?: any };
      solflare?: any;
      backpack?: any;
      glowSolana?: any;
      solana?: any;
      __pacfiWalletProvider?: any;
    };

    const storedPreferredWallet = localStorage.getItem('pacfi_wallet_provider');

    const providers = [
      { key: 'phantom', provider: anyWindow.phantom?.solana },
      { key: 'solflare', provider: anyWindow.solflare },
      { key: 'backpack', provider: anyWindow.backpack },
      { key: 'glow', provider: anyWindow.glowSolana },
      { key: 'solana', provider: anyWindow.solana },
    ].filter((item) => Boolean(item.provider));

    if (providers.length === 0) {
      return null;
    }

    const preferred = providers.find((item) => item.key === storedPreferredWallet);
    const resolved = preferred ?? providers[0];

    anyWindow.__pacfiWalletProvider = resolved.provider;
    return { provider: resolved.provider, key: resolved.key };
  }, []);

  const syncWalletState = useCallback(() => {
    const resolved = getProvider();

    if (!resolved) {
      // No wallet extension installed — keep localStorage state as-is
      return;
    }

    const rawAddress = resolved.provider?.publicKey?.toBase58?.() ?? null;
    const currentAddress = rawAddress && isValidSolanaAddress(rawAddress) ? rawAddress : null;
    const providerConnected = resolved.provider?.isConnected;

    if (currentAddress && providerConnected) {
      // Provider confirms connected — update state and localStorage
      localStorage.setItem(STORAGE_KEY_ADDRESS, currentAddress);
      setWalletAddress(currentAddress);
      setIsConnected(true);
    } else if (providerConnected === false && !readStoredAddress()) {
      // Provider explicitly says disconnected AND there's no stored session — clear state.
      // We don't clear when there IS a stored address because the provider might just be
      // initializing (race condition on page load); auto-reconnect will handle that case.
      setWalletAddress(null);
      setIsConnected(false);
    }
    // If providerConnected is undefined/null or there's a stored session, keep current state
  }, [getProvider]);

  // Auto-reconnect on page load if a stored address exists.
  // Uses onlyIfTrusted so no popup appears — it only reconnects if the
  // wallet extension already has this site in its trusted list.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const storedAddress = readStoredAddress();
    if (!storedAddress) {
      // No previous session — nothing to restore
      syncWalletState();
      return;
    }

    const resolved = getProvider();
    if (!resolved) {
      // Extension not installed — keep localStorage address visible but not "active"
      syncWalletState();
      return;
    }

    // If provider already shows connected (e.g. same-tab navigation), just sync
    if (resolved.provider?.isConnected) {
      syncWalletState();
      return;
    }

    // Try silent reconnect without popup
    resolved.provider
      .connect({ onlyIfTrusted: true })
      .then(() => {
        syncWalletState();
      })
      .catch(() => {
        // Extension declined silent reconnect — keep stored address so UI shows
        // truncated address, but mark as not truly connected so signing works correctly.
        // User can click Connect to re-authorize.
        syncWalletState();
      });
  }, []); // intentionally empty — runs once on mount

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleWalletChange = () => syncWalletState();

    window.addEventListener('focus', handleWalletChange);
    window.addEventListener('pacfi-wallet-state-changed', handleWalletChange as EventListener);

    return () => {
      window.removeEventListener('focus', handleWalletChange);
      window.removeEventListener('pacfi-wallet-state-changed', handleWalletChange as EventListener);
    };
  }, [syncWalletState]);

  const emitWalletChanged = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('pacfi-wallet-state-changed'));
    }
  }, []);

  const connect = useCallback(async (): Promise<string | null> => {
    const resolved = getProvider();
    if (!resolved) {
      throw new Error('No Solana wallet detected. Install Phantom, Solflare, Backpack, or Glow.');
    }

    setIsConnecting(true);

    try {
      const connection = await resolved.provider.connect();
      localStorage.setItem('pacfi_wallet_provider', resolved.key);

      const rawAddress =
        connection?.publicKey?.toBase58?.() ?? resolved.provider?.publicKey?.toBase58?.() ?? null;

      const nextAddress = rawAddress && isValidSolanaAddress(rawAddress) ? rawAddress : null;

      if (!nextAddress) {
        throw new Error('Invalid wallet address received');
      }

      console.log('[Wallet] Connected with address:', nextAddress);
      localStorage.setItem(STORAGE_KEY_ADDRESS, nextAddress);
      localStorage.setItem('pacfi_wallet_provider', resolved.key);
      setWalletAddress(nextAddress);
      setIsConnected(true);
      emitWalletChanged();

      return nextAddress;
    } finally {
      setIsConnecting(false);
    }
  }, [emitWalletChanged, getProvider]);

  const handleDisconnect = useCallback(async (): Promise<void> => {
    const resolved = getProvider();
    if (resolved?.provider?.disconnect) {
      try { await resolved.provider.disconnect(); } catch { /* ignore */ }
    }

    localStorage.removeItem(STORAGE_KEY_ADDRESS);
    localStorage.removeItem('pacfi_wallet_provider');
    setWalletAddress(null);
    setIsConnected(false);
    emitWalletChanged();
  }, [emitWalletChanged, getProvider]);

  const signMessage = useCallback(
    async (message: string): Promise<string> => {
      const resolved = getProvider();
      if (!resolved?.provider) {
        throw new Error('Wallet is not available');
      }

      if (!resolved.provider.signMessage) {
        throw new Error('Wallet does not support message signing');
      }

      const messageBytes = new TextEncoder().encode(message);
      const result = await resolved.provider.signMessage(messageBytes, 'utf8');
      const signatureBytes: Uint8Array = result?.signature ?? result;

      return bs58.encode(signatureBytes);
    },
    [getProvider]
  );

  return {
    walletAddress,
    isConnected,
    isConnecting,
    connect,
    disconnect: handleDisconnect,
    signMessage,
  };
};

interface WalletConnectProps {
  onConnect?: (address: string) => void;
  onDisconnect?: () => void;
}

export default function WalletConnect({ onConnect, onDisconnect }: WalletConnectProps) {
  const { walletAddress, isConnected, disconnect, connect, isConnecting } = useWalletContext();
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && isConnected && walletAddress && !isValidSolanaAddress(walletAddress)) {
      console.warn('[Wallet] Invalid address detected, disconnecting');
      setError('Invalid wallet address detected');
      disconnect();
    }
  }, [mounted, isConnected, walletAddress, disconnect]);

  useEffect(() => {
    if (isConnected && walletAddress) {
      onConnect?.(walletAddress);
    }
  }, [isConnected, walletAddress]);

  const handleConnect = async () => {
    setError(null);
    try {
      await connect();
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : 'Failed to connect wallet');
    }
  };

  const handleDisconnect = async () => {
    await disconnect();
    onDisconnect?.();
  };

  if (!mounted) {
    return (
      <div className="wallet-connect">
        <button className="connect-btn" disabled>
          Connect Wallet
        </button>
      </div>
    );
  }

  return (
    <div className="wallet-connect">
      {isConnected && walletAddress ? (
        <div className="wallet-info">
          <div className="wallet-address">
            {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}
          </div>
          <button onClick={handleDisconnect} className="disconnect-btn">
            Disconnect
          </button>
        </div>
      ) : (
        <button onClick={handleConnect} className="connect-btn" disabled={isConnecting}>
          {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </button>
      )}
      {error ? <div className="wallet-error">{error}</div> : null}
    </div>
  );
}

const styles = `
  .wallet-connect {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .connect-btn,
  .disconnect-btn {
    background-color: #2563eb;
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    border: none;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.2s;
    font-size: 14px;
  }

  .connect-btn:hover:not(:disabled),
  .disconnect-btn:hover {
    background-color: #1d4ed8;
  }

  .connect-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .wallet-error {
    color: #dc2626;
    font-size: 12px;
    font-weight: 500;
  }

  .wallet-info {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.5rem 1rem;
    background-color: #f3f4f6;
    border-radius: 0.375rem;
    border: 1px solid #e5e7eb;
  }

  .wallet-address {
    font-family: monospace;
    font-size: 0.875rem;
    font-weight: 500;
    color: #1f2937;
  }
`;

if (typeof document !== 'undefined') {
  const existing = document.getElementById('wallet-connect-styles');
  if (!existing) {
    const styleEl = document.createElement('style');
    styleEl.id = 'wallet-connect-styles';
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);
  }
}
