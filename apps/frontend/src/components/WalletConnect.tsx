import React, { useState, useEffect } from 'react';

interface WalletContextType {
  walletAddress: string | null;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  signMessage: (message: string) => Promise<string>;
}

export const useWallet = (): WalletContextType => {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Check if wallet is already connected
  useEffect(() => {
    const checkWallet = async () => {
      if (typeof window !== 'undefined' && (window as any).phantom?.solana) {
        try {
          const phantom = (window as any).phantom.solana;
          if (phantom.isConnected) {
            const pubKey = phantom.publicKey.toString();
            setWalletAddress(pubKey);
            setIsConnected(true);
          }
        } catch (error) {
          console.error('Error checking wallet:', error);
        }
      }
    };

    checkWallet();
  }, []);

  const connect = async () => {
    if (typeof window === 'undefined') return;

    const phantom = (window as any).phantom?.solana;

    if (!phantom) {
      alert('Please install Phantom wallet');
      return;
    }

    try {
      const response = await phantom.connect();
      const pubKey = response.publicKey.toString();
      setWalletAddress(pubKey);
      setIsConnected(true);
    } catch (error) {
      console.error('Error connecting wallet:', error);
    }
  };

  const disconnect = async () => {
    if (typeof window === 'undefined') return;

    const phantom = (window as any).phantom?.solana;

    if (phantom) {
      try {
        await phantom.disconnect();
        setWalletAddress(null);
        setIsConnected(false);
      } catch (error) {
        console.error('Error disconnecting wallet:', error);
      }
    }
  };

  const signMessage = async (message: string): Promise<string> => {
    if (typeof window === 'undefined' || !isConnected) {
      throw new Error('Wallet not connected');
    }

    const phantom = (window as any).phantom?.solana;

    if (!phantom) {
      throw new Error('Phantom wallet not found');
    }

    try {
      const messageBytes = new TextEncoder().encode(message);
      const response = await phantom.signMessage(messageBytes, 'utf8');
      const signature = response.signature;

      // Convert to base58 string
      return signature.toString('base64');
    } catch (error) {
      console.error('Error signing message:', error);
      throw error;
    }
  };

  return {
    walletAddress,
    isConnected,
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
  const { walletAddress, isConnected, connect, disconnect } = useWallet();

  const handleConnect = async () => {
    await connect();
    if (walletAddress) {
      onConnect?.(walletAddress);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    onDisconnect?.();
  };

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
        <button onClick={handleConnect} className="connect-btn">
          Connect Wallet
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
  }

  .connect-btn:hover,
  .disconnect-btn:hover {
    background-color: #1d4ed8;
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
