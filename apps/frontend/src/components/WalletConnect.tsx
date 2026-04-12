import React, { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import bs58 from 'bs58';

interface WalletContextType {
  walletAddress: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => Promise<string | null>;
  disconnect: () => Promise<void>;
  signMessage: (message: string) => Promise<string>;
}

export const useWalletContext = (): WalletContextType => {
  const {
    publicKey,
    connected,
    connecting,
    disconnect,
    connect: adapterConnect,
    signMessage: adapterSignMessage,
    wallet,
  } = useWallet();
  const modal = useWalletModal();

  const walletAddress = publicKey ? publicKey.toBase58() : null;
  const isConnected = connected;

  const connect = useCallback(async (): Promise<string | null> => {
    if (!wallet) {
      modal.setVisible(true);
      return null;
    }

    await adapterConnect();
    return publicKey ? publicKey.toBase58() : null;
  }, [wallet, modal, adapterConnect, publicKey]);

  const handleDisconnect = useCallback(async (): Promise<void> => {
    await disconnect();
  }, [disconnect]);

  const signMessage = useCallback(
    async (message: string): Promise<string> => {
      if (!adapterSignMessage) {
        throw new Error('Wallet does not support message signing');
      }
      const messageBytes = new TextEncoder().encode(message);
      const signature = await adapterSignMessage(messageBytes);
      return bs58.encode(signature);
    },
    [adapterSignMessage]
  );

  return {
    walletAddress,
    isConnected,
    isConnecting: connecting,
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
  const { walletAddress, isConnected, disconnect } = useWalletContext();
  const { setVisible } = useWalletModal();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isConnected && walletAddress) {
      onConnect?.(walletAddress);
    }
  }, [isConnected, walletAddress]);

  const handleConnect = () => {
    setVisible(true);
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
  const existing = document.getElementById('wallet-connect-styles');
  if (!existing) {
    const styleEl = document.createElement('style');
    styleEl.id = 'wallet-connect-styles';
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);
  }
}
