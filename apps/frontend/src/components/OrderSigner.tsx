import React, { useState } from 'react';
import { useWallet } from './WalletConnect';

interface OrderSignerProps {
  onOrderSigned?: (signedOrder: any) => void;
  onError?: (error: string) => void;
}

/**
 * Recursively sort JSON keys alphabetically
 */
function sortJsonKeys(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(sortJsonKeys);
  } else if (obj !== null && typeof obj === 'object') {
    const sorted: any = {};
    Object.keys(obj)
      .sort()
      .forEach((key) => {
        sorted[key] = sortJsonKeys(obj[key]);
      });
    return sorted;
  }
  return obj;
}

/**
 * Create compact JSON string (no whitespace)
 */
function createCompactJson(obj: any): string {
  return JSON.stringify(obj, null, 0).replace(/\s+/g, '');
}

export default function OrderSigner({ onOrderSigned, onError }: OrderSignerProps) {
  const { walletAddress, isConnected, signMessage } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [orderData, setOrderData] = useState({
    symbol: 'BTC',
    side: 'bid',
    amount: '0.1',
    price: '100000',
    leverage: '1',
  });

  const handleSignOrder = async () => {
    if (!isConnected || !walletAddress) {
      onError?.('Wallet not connected');
      return;
    }

    setIsLoading(true);

    try {
      const timestamp = Date.now();

      // Create payload to sign
      const payload = {
        timestamp,
        expiry_window: 30000,
        type: 'create_order',
        data: {
          symbol: orderData.symbol,
          side: orderData.side as 'bid' | 'ask',
          amount: orderData.amount,
          price: orderData.price,
          tif: 'GTC',
          reduce_only: false,
          client_order_id: crypto.randomUUID(),
        },
      };

      // Sort and create compact JSON
      const sorted = sortJsonKeys(payload);
      const compact = createCompactJson(sorted);

      // Sign message
      const signature = await signMessage(compact);

      // Build signed order
      const signedOrder = {
        account: walletAddress,
        agent_wallet: null,
        signature,
        timestamp,
        expiry_window: 30000,
        symbol: orderData.symbol,
        side: orderData.side,
        amount: orderData.amount,
        price: orderData.price,
        tif: 'GTC',
        reduce_only: false,
        client_order_id: payload.data.client_order_id,
      };

      onOrderSigned?.(signedOrder);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      onError?.(errorMessage);
      console.error('Error signing order:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="order-signer">
      <h3>Sign Order</h3>

      {!isConnected ? (
        <p className="warning">Please connect your wallet first</p>
      ) : (
        <>
          <div className="form-group">
            <label>Symbol</label>
            <input
              type="text"
              value={orderData.symbol}
              onChange={(e) => setOrderData({ ...orderData, symbol: e.target.value })}
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label>Side</label>
            <select
              value={orderData.side}
              onChange={(e) => setOrderData({ ...orderData, side: e.target.value })}
              disabled={isLoading}
            >
              <option value="bid">Buy</option>
              <option value="ask">Sell</option>
            </select>
          </div>

          <div className="form-group">
            <label>Amount</label>
            <input
              type="number"
              value={orderData.amount}
              onChange={(e) => setOrderData({ ...orderData, amount: e.target.value })}
              disabled={isLoading}
              step="0.01"
            />
          </div>

          <div className="form-group">
            <label>Price</label>
            <input
              type="number"
              value={orderData.price}
              onChange={(e) => setOrderData({ ...orderData, price: e.target.value })}
              disabled={isLoading}
              step="1"
            />
          </div>

          <div className="form-group">
            <label>Leverage</label>
            <input
              type="number"
              value={orderData.leverage}
              onChange={(e) => setOrderData({ ...orderData, leverage: e.target.value })}
              disabled={isLoading}
              min="1"
              max="50"
            />
          </div>

          <button
            onClick={handleSignOrder}
            disabled={isLoading}
            className="sign-btn"
          >
            {isLoading ? 'Signing...' : 'Sign & Send Order'}
          </button>
        </>
      )}
    </div>
  );
}

const styles = `
  .order-signer {
    background-color: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    padding: 1.5rem;
    max-width: 400px;
  }

  .order-signer h3 {
    margin-top: 0;
    margin-bottom: 1.5rem;
    font-size: 1.25rem;
    font-weight: 600;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    font-size: 0.875rem;
    color: #374151;
  }

  .form-group input,
  .form-group select {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 1rem;
    font-family: inherit;
  }

  .form-group input:focus,
  .form-group select:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }

  .form-group input:disabled,
  .form-group select:disabled {
    background-color: #f3f4f6;
    color: #9ca3af;
    cursor: not-allowed;
  }

  .sign-btn {
    width: 100%;
    padding: 0.75rem;
    background-color: #2563eb;
    color: white;
    border: none;
    border-radius: 0.375rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .sign-btn:hover:not(:disabled) {
    background-color: #1d4ed8;
  }

  .sign-btn:disabled {
    background-color: #9ca3af;
    cursor: not-allowed;
  }

  .warning {
    padding: 0.75rem;
    background-color: #fef3c7;
    border: 1px solid #fcd34d;
    border-radius: 0.375rem;
    color: #92400e;
    font-size: 0.875rem;
  }
`;

if (typeof document !== 'undefined') {
  const styleEl = document.createElement('style');
  styleEl.textContent = styles;
  document.head.appendChild(styleEl);
}
