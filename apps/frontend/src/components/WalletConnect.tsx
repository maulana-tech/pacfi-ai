import React, { useState, useEffect, useCallback } from 'react';

interface WindowWithPhantom extends Window {
  phantom?: {
    solana?: {
      isConnected: boolean;
      publicKey: { toString: () => string } | null;
      connect: (params?: {
        onlyIfTrusted?: boolean;
      }) => Promise<{ publicKey: { toString: () => string } }>;
      disconnect: () => Promise<void>;
      signMessage: (message: Uint8Array, encoding: string) => Promise<{ signature: Uint8Array }>;
      on: (event: string, callback: (args: any) => void) => void;
      off: (event: string, callback: (args: any) => void) => void;
    };
  };
}

interface WalletContextType {
  walletAddress: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => Promise<string | null>;
  disconnect: () => Promise<void>;
  signMessage: (message: string) => Promise<string>;
}

const WALLET_STORAGE_KEY = 'phantom_wallet_connected';

export const useWallet = (): WalletContextType => {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Check if wallet was previously connected
  useEffect(() => {
    const initWallet = async () => {
      if (typeof window === 'undefined') return;

      const win = window as WindowWithPhantom;
      const phantom = win.phantom?.solana;

      if (!phantom) {
        setIsReady(true);
        return;
      }

      try {
        // Check if user was previously connected
        const wasConnected = localStorage.getItem(WALLET_STORAGE_KEY);

        if (wasConnected === 'true') {
          // Try silent connect (without popup if already trusted)
          try {
            const response = await phantom.connect({ onlyIfTrusted: true });
            if (response?.publicKey) {
              const pubKey = response.publicKey.toString();
              setWalletAddress(pubKey);
              setIsConnected(true);
              localStorage.setItem(WALLET_STORAGE_KEY, 'true');
            }
          } catch (silentError) {
            // Silent connect failed, user needs to manually connect
            console.log('Silent connect failed, waiting for manual connect');
            localStorage.removeItem(WALLET_STORAGE_KEY);
          }
        }

        // Listen for account changes
        const handleAccountChange = (publicKey: any) => {
          if (publicKey) {
            setWalletAddress(publicKey.toString());
            setIsConnected(true);
            localStorage.setItem(WALLET_STORAGE_KEY, 'true');
          } else {
            setWalletAddress(null);
            setIsConnected(false);
            localStorage.removeItem(WALLET_STORAGE_KEY);
          }
        };

        const handleDisconnect = () => {
          setWalletAddress(null);
          setIsConnected(false);
          localStorage.removeItem(WALLET_STORAGE_KEY);
        };

        phantom.on('accountChanged', handleAccountChange);
        phantom.on('disconnect', handleDisconnect);

        return () => {
          phantom.off('accountChanged', handleAccountChange);
          phantom.off('disconnect', handleDisconnect);
        };
      } catch (error) {
        console.error('Error initializing wallet:', error);
      } finally {
        setIsReady(true);
      }
    };

    // Small delay to ensure Phantom has injected
    const timer = setTimeout(initWallet, 300);
    return () => clearTimeout(timer);
  }, []);

  const connect = useCallback(async (): Promise<string | null> => {
    if (typeof window === 'undefined') return null;

    const win = window as WindowWithPhantom;
    const phantom = win.phantom?.solana;

    if (!phantom) {
      window.open('https://phantom.app/', '_blank');
      alert('Please install Phantom wallet and refresh the page');
      return null;
    }

    setIsConnecting(true);

    try {
      const response = await phantom.connect();
      const pubKey = response.publicKey.toString();
      setWalletAddress(pubKey);
      setIsConnected(true);
      localStorage.setItem(WALLET_STORAGE_KEY, 'true');
      return pubKey;
    } catch (error) {
      console.error('Error connecting wallet:', error);
      if (error instanceof Error) {
        // Don't alert on user rejection
        if (!error.message.includes('User rejected')) {
          alert(`Failed to connect: ${error.message}`);
        }
      }
      return null;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async (): Promise<void> => {
    if (typeof window === 'undefined') return;

    const win = window as WindowWithPhantom;
    const phantom = win.phantom?.solana;

    if (phantom) {
      try {
        await phantom.disconnect();
      } catch (error) {
        console.error('Error disconnecting wallet:', error);
      }
    }

    setWalletAddress(null);
    setIsConnected(false);
    localStorage.removeItem(WALLET_STORAGE_KEY);
  }, []);

  const signMessage = useCallback(
    async (message: string): Promise<string> => {
      if (typeof window === 'undefined' || !isConnected) {
        throw new Error('Wallet not connected');
      }

      const win = window as WindowWithPhantom;
      const phantom = win.phantom?.solana;

      if (!phantom) {
        throw new Error('Phantom wallet not found');
      }

      try {
        const messageBytes = new TextEncoder().encode(message);
        const response = await phantom.signMessage(messageBytes, 'utf8');
        const signature = response.signature;

        // Convert to base58-like string
        return btoa(String.fromCharCode(...new Uint8Array(signature)));
      } catch (error) {
        console.error('Error signing message:', error);
        throw error;
      }
    },
    [isConnected]
  );

  return {
    walletAddress,
    isConnected,
    isConnecting,
    connect,
    disconnect,
    signMessage,
  };
};

interface WalletConnectProps {
  onConnect?: (address: string) => void;
  onDisconnect?: () => void;
}

export default function WalletConnect({ onConnect, onDisconnect }: WalletConnectProps) {
  const { walletAddress, isConnected, isConnecting, connect, disconnect } = useWallet();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleConnect = async () => {
    const address = await connect();
    if (address) {
      onConnect?.(address);
    }
  };

  const handleDisconnect = async () => {
    await disconnect();
    onDisconnect?.();
  };

  // Prevent hydration mismatch
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
        <button onClick={handleConnect} disabled={isConnecting} className="connect-btn">
          {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </button>
      )}
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
  const styleEl = document.createElement('style');
  styleEl.textContent = styles;
  document.head.appendChild(styleEl);
}
