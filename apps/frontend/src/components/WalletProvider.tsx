import React, { useMemo, useCallback, useState, useEffect } from 'react';
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from '@solana/wallet-adapter-react';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';
import { BackpackWalletAdapter } from '@solana/wallet-adapter-backpack';
import { GlowWalletAdapter } from '@solana/wallet-adapter-glow';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';

import '@solana/wallet-adapter-react-ui/styles.css';

/**
 * RPC endpoint for Solana transactions.
 * For Pacifica testnet, use Solana devnet: https://api.devnet.solana.com
 * For Pacifica mainnet, use Solana mainnet: https://api.mainnet-beta.solana.com
 * Can be overridden via PUBLIC_SOLANA_RPC_URL environment variable
 */
const RPC_ENDPOINT = (import.meta.env.PUBLIC_SOLANA_RPC_URL as string | undefined) || 
  'https://api.devnet.solana.com';

export default function WalletProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new BackpackWalletAdapter(),
      new GlowWalletAdapter(),
    ],
    []
  );

  const onError = useCallback((error: unknown) => {
    console.error('[Wallet] Error:', error);
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ConnectionProvider endpoint={RPC_ENDPOINT}>
      <SolanaWalletProvider wallets={wallets} onError={onError} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}
