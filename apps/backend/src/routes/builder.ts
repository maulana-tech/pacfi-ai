import { Hono } from 'hono';
import { getWalletContext } from '../middleware/auth';
import { errorEnvelope, successEnvelope } from '../lib/api';
import { PacificaClient } from '../services/pacifica';
import { PacificaOrderSigner } from '../services/signing';

const router = new Hono();
const pacificaClient = new PacificaClient();

const BUILDER_CODE_REGEX = /^[a-zA-Z0-9]{1,16}$/;
const FEE_RATE_REGEX = /^\d+(\.\d+)?$/;

function parseTimestamp(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function isValidBuilderCode(builderCode: string): boolean {
  return BUILDER_CODE_REGEX.test(builderCode);
}

function isValidFeeRate(feeRate: string): boolean {
  if (!FEE_RATE_REGEX.test(feeRate)) {
    return false;
  }

  const parsed = Number.parseFloat(feeRate);
  return Number.isFinite(parsed) && parsed >= 0;
}

function getSignedRequestMeta(
  wallet: ReturnType<typeof getWalletContext>,
  body: Record<string, unknown>
): { signature: string; timestamp: number; expiryWindow: number } | { error: string } {
  const signature =
    (typeof wallet?.signature === 'string' && wallet.signature) ||
    (typeof body.signature === 'string' && body.signature) ||
    '';

  if (!signature) {
    return { error: 'Missing required header X-Signature or body field signature' };
  }

  if (!PacificaOrderSigner.isValidSignature(signature)) {
    return { error: 'Invalid signature format' };
  }

  const timestamp = parseTimestamp(body.timestamp);
  if (!timestamp) {
    return { error: 'Missing required field timestamp' };
  }

  const expiryWindow = parseTimestamp(body.expiryWindow ?? body.expiry_window) ?? 5000;

  return {
    signature,
    timestamp,
    expiryWindow,
  };
}

router.get('/approvals', async (c) => {
  try {
    const wallet = getWalletContext(c);

    if (!wallet) {
      return c.json(errorEnvelope('Invalid wallet address'), 400);
    }

    const approvals = await pacificaClient.getBuilderApprovals(wallet.walletAddress);
    return c.json(successEnvelope({ approvals }));
  } catch (error) {
    console.error('[Builder] Error fetching approvals:', error);
    return c.json(errorEnvelope(error instanceof Error ? error.message : 'Unknown error'), 500);
  }
});

router.post('/approve', async (c) => {
  try {
    const wallet = getWalletContext(c);

    if (!wallet) {
      return c.json(errorEnvelope('Invalid wallet address'), 400);
    }

    const body = await c.req.json();
    const builderCode = String(body.builderCode ?? '');
    const maxFeeRate = String(body.maxFeeRate ?? '');

    if (!isValidBuilderCode(builderCode)) {
      return c.json(errorEnvelope('Invalid builder code format. Use 1-16 alphanumeric characters.'), 400);
    }

    if (!isValidFeeRate(maxFeeRate)) {
      return c.json(errorEnvelope('Invalid fee rate format.'), 400);
    }

    const meta = getSignedRequestMeta(wallet, body);
    if ('error' in meta) {
      return c.json(errorEnvelope(meta.error), 400);
    }

    const approval = await pacificaClient.approveBuilderCode(
      wallet.walletAddress,
      meta.signature,
      meta.timestamp,
      builderCode,
      maxFeeRate,
      meta.expiryWindow
    );

    return c.json(successEnvelope({ approval }));
  } catch (error) {
    console.error('[Builder] Error approving builder code:', error);
    return c.json(errorEnvelope(error instanceof Error ? error.message : 'Unknown error'), 500);
  }
});

router.post('/revoke', async (c) => {
  try {
    const wallet = getWalletContext(c);

    if (!wallet) {
      return c.json(errorEnvelope('Invalid wallet address'), 400);
    }

    const body = await c.req.json();
    const builderCode = String(body.builderCode ?? '');

    if (!isValidBuilderCode(builderCode)) {
      return c.json(errorEnvelope('Invalid builder code format. Use 1-16 alphanumeric characters.'), 400);
    }

    const meta = getSignedRequestMeta(wallet, body);
    if ('error' in meta) {
      return c.json(errorEnvelope(meta.error), 400);
    }

    const revoked = await pacificaClient.revokeBuilderCode(
      wallet.walletAddress,
      meta.signature,
      meta.timestamp,
      builderCode,
      meta.expiryWindow
    );

    return c.json(successEnvelope({ revoked }));
  } catch (error) {
    console.error('[Builder] Error revoking builder code:', error);
    return c.json(errorEnvelope(error instanceof Error ? error.message : 'Unknown error'), 500);
  }
});

router.post('/update-fee-rate', async (c) => {
  try {
    const wallet = getWalletContext(c);

    if (!wallet) {
      return c.json(errorEnvelope('Invalid wallet address'), 400);
    }

    const body = await c.req.json();
    const builderCode = String(body.builderCode ?? '');
    const feeRate = String(body.feeRate ?? '');

    if (!isValidBuilderCode(builderCode)) {
      return c.json(errorEnvelope('Invalid builder code format. Use 1-16 alphanumeric characters.'), 400);
    }

    if (!isValidFeeRate(feeRate)) {
      return c.json(errorEnvelope('Invalid fee rate format.'), 400);
    }

    const meta = getSignedRequestMeta(wallet, body);
    if ('error' in meta) {
      return c.json(errorEnvelope(meta.error), 400);
    }

    const update = await pacificaClient.updateBuilderFeeRate(
      wallet.walletAddress,
      meta.signature,
      meta.timestamp,
      builderCode,
      feeRate,
      meta.expiryWindow
    );

    return c.json(successEnvelope({ update }));
  } catch (error) {
    console.error('[Builder] Error updating fee rate:', error);
    return c.json(errorEnvelope(error instanceof Error ? error.message : 'Unknown error'), 500);
  }
});

export { router as builderRouter };
