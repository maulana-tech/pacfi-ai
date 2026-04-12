import crypto from 'crypto';
import base58 from 'bs58';

/**
 * Pacifica Order Signing Service
 * Implements Ed25519 signing for Pacifica API orders
 */

interface OrderData {
  symbol: string;
  amount: string;
  side: 'bid' | 'ask';
  price?: string;
  tif?: string;
  reduce_only?: boolean;
  client_order_id?: string;
  builder_code?: string;
  leverage?: number;
}

interface SignaturePayload {
  timestamp: number;
  expiry_window: number;
  type: string;
  data: OrderData | Record<string, unknown>;
}

interface SignedOrder {
  account: string;
  agent_wallet: null;
  signature: string;
  timestamp: number;
  expiry_window: number;
  [key: string]: any;
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

/**
 * Sign order data using Ed25519
 * Note: This is a placeholder - actual signing requires Solana keypair
 * In production, signing should happen on frontend or via wallet integration
 */
export class PacificaOrderSigner {
  /**
   * Prepare order for signing
   * Returns the data that needs to be signed by the wallet
   */
  static prepareOrderForSigning(orderData: OrderData): SignaturePayload {
    const timestamp = Date.now();

    const payload: SignaturePayload = {
      timestamp,
      expiry_window: 30000, // 30 seconds
      type: 'create_order',
      data: orderData,
    };

    return payload;
  }

  static prepareMarketOrderForSigning(orderData: OrderData): SignaturePayload {
    const timestamp = Date.now();

    return {
      timestamp,
      expiry_window: 30000,
      type: 'create_market_order',
      data: orderData,
    };
  }

  static prepareBuilderApprovalForSigning(
    builderCode: string,
    maxFeeRate: string,
    expiryWindow: number = 5000
  ): SignaturePayload {
    return {
      timestamp: Date.now(),
      expiry_window: expiryWindow,
      type: 'approve_builder_code',
      data: {
        builder_code: builderCode,
        max_fee_rate: maxFeeRate,
      },
    };
  }

  static prepareBuilderFeeRateUpdateForSigning(
    builderCode: string,
    feeRate: string,
    expiryWindow: number = 5000
  ): SignaturePayload {
    return {
      timestamp: Date.now(),
      expiry_window: expiryWindow,
      type: 'update_builder_code_fee_rate',
      data: {
        builder_code: builderCode,
        fee_rate: feeRate,
      },
    };
  }

  static prepareBuilderRevokeForSigning(
    builderCode: string,
    expiryWindow: number = 5000
  ): SignaturePayload {
    return {
      timestamp: Date.now(),
      expiry_window: expiryWindow,
      type: 'revoke_builder_code',
      data: {
        builder_code: builderCode,
      },
    };
  }

  /**
   * Create the message to be signed
   * This is what gets hashed and signed by the wallet
   */
  static createMessageToSign(payload: SignaturePayload): string {
    const sorted = sortJsonKeys(payload);
    const compact = createCompactJson(sorted);
    return compact;
  }

  /**
   * Build final signed request
   * This is what gets sent to Pacifica API
   */
  static buildSignedRequest(
    orderData: OrderData,
    walletAddress: string,
    signature: string,
    timestamp: number,
    expiry_window: number = 30000
  ): SignedOrder {
    const signedRequest: SignedOrder = {
      account: walletAddress,
      agent_wallet: null,
      signature,
      timestamp,
      expiry_window,
      ...orderData,
    };

    return signedRequest;
  }

  /**
   * Validate signature format (Base58)
   */
  static isValidSignature(signature: string): boolean {
    try {
      base58.decode(signature);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create market order
   */
  static createMarketOrder(
    symbol: string,
    amount: string,
    side: 'bid' | 'ask',
    leverage?: number,
    builderCode?: string
  ): OrderData {
    return {
      symbol,
      amount,
      side,
      leverage,
      builder_code: builderCode,
      reduce_only: false,
      client_order_id: this.generateClientOrderId(),
    };
  }

  /**
   * Create limit order
   */
  static createLimitOrder(
    symbol: string,
    amount: string,
    side: 'bid' | 'ask',
    price: string,
    leverage?: number,
    builderCode?: string
  ): OrderData {
    return {
      symbol,
      amount,
      side,
      price,
      tif: 'GTC',
      leverage,
      builder_code: builderCode,
      reduce_only: false,
      client_order_id: this.generateClientOrderId(),
    };
  }

  /**
   * Generate unique client order ID
   */
  static generateClientOrderId(): string {
    return crypto.randomUUID();
  }
}
