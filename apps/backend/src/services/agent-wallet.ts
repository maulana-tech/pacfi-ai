import bs58 from 'bs58';
import crypto from 'crypto';
import { PacificaOrderSigner } from './signing';

type AgentOrderInput = {
  symbol: string;
  side: 'bid' | 'ask';
  amount: string;
  price?: string;
  clientOrderId?: string;
  builderCode?: string;
};

type AgentOrderAuth = {
  agentWallet: string;
  signature: string;
  timestamp: number;
};

export class PacificaAgentWalletService {
  private privateKey: crypto.KeyObject | null = null;
  private publicKey: string | null = null;
  private managedAccount: string | null = null;

  constructor() {
    const privateKey = process.env.PACIFICA_AGENT_PRIVATE_KEY?.trim();
    const managedAccount = process.env.PACIFICA_AGENT_ACCOUNT?.trim();
    const configuredPublicKey = process.env.PACIFICA_AGENT_PUBLIC_KEY?.trim();

    if (!privateKey || !managedAccount) {
      return;
    }

    const secretKey = bs58.decode(privateKey);
    if (secretKey.length !== 64) {
      throw new Error('PACIFICA_AGENT_PRIVATE_KEY must decode to a 64-byte Solana secret key');
    }

    const privateSeed = secretKey.subarray(0, 32);
    const publicKeyBytes = secretKey.subarray(32, 64);
    const derivedPublicKey = bs58.encode(publicKeyBytes);
    const jwk = {
      kty: 'OKP',
      crv: 'Ed25519',
      d: Buffer.from(privateSeed).toString('base64url'),
      x: Buffer.from(publicKeyBytes).toString('base64url'),
    };
    const privateKeyObject = crypto.createPrivateKey({ key: jwk, format: 'jwk' });

    if (configuredPublicKey && configuredPublicKey !== derivedPublicKey) {
      throw new Error('PACIFICA_AGENT_PUBLIC_KEY does not match PACIFICA_AGENT_PRIVATE_KEY');
    }

    this.privateKey = privateKeyObject;
    this.publicKey = derivedPublicKey;
    this.managedAccount = managedAccount;
  }

  isEnabled(): boolean {
    return Boolean(this.privateKey && this.publicKey && this.managedAccount);
  }

  getStatus() {
    return {
      enabled: this.isEnabled(),
      agentWallet: this.publicKey,
      managedAccount: this.managedAccount,
    };
  }

  canManageAccount(account: string): boolean {
    return this.isEnabled() && this.managedAccount === account;
  }

  signOrder(
    account: string,
    orderType: 'market' | 'limit',
    input: AgentOrderInput
  ): AgentOrderAuth {
    if (!this.privateKey || !this.publicKey || !this.managedAccount) {
      throw new Error('Agent wallet is not configured');
    }

    if (account !== this.managedAccount) {
      throw new Error('Agent wallet is not authorized for this account');
    }

    const timestamp = Date.now();
    const orderData =
      orderType === 'market'
        ? {
            symbol: input.symbol,
            amount: input.amount,
            side: input.side,
            slippage_percent: '0.5',
            reduce_only: false,
            client_order_id: input.clientOrderId,
            builder_code: input.builderCode,
          }
        : {
            symbol: input.symbol,
            amount: input.amount,
            side: input.side,
            price: input.price,
            tif: 'GTC',
            reduce_only: false,
            client_order_id: input.clientOrderId,
            builder_code: input.builderCode,
          };

    const payload =
      orderType === 'market'
        ? PacificaOrderSigner.prepareMarketOrderForSigning(orderData)
        : PacificaOrderSigner.prepareOrderForSigning(orderData);

    payload.timestamp = timestamp;
    const message = PacificaOrderSigner.createMessageToSign(payload);
    const signatureBytes = crypto.sign(null, Buffer.from(message, 'utf8'), this.privateKey);

    return {
      agentWallet: this.publicKey,
      signature: bs58.encode(signatureBytes),
      timestamp,
    };
  }
}

export const pacificaAgentWalletService = new PacificaAgentWalletService();
