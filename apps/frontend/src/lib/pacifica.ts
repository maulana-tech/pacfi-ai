const API_BASE =
  (import.meta.env.PUBLIC_API_URL as string | undefined)?.replace(/\/$/, '') ||
  'http://localhost:3001';

export const BUILDER_CODE_REGEX = /^[a-zA-Z0-9]{1,16}$/;
export const FEE_RATE_REGEX = /^\d+(\.\d+)?$/;

type BuilderOperationType =
  | 'approve_builder_code'
  | 'revoke_builder_code'
  | 'update_builder_code_fee_rate';

type OrderOperationType = 'create_market_order' | 'create_order';

export type BuilderApproval = {
  builder_code: string;
  max_fee_rate?: string;
};

export type AgentStatus = {
  enabled: boolean;
  agentWallet: string | null;
  managedAccount: string | null;
};

function sortJsonKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortJsonKeys);
  }

  if (value && typeof value === 'object') {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = sortJsonKeys((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }

  return value;
}

export function buildMessageToSign(payload: Record<string, unknown>): string {
  return JSON.stringify(sortJsonKeys(payload));
}

export async function pacificaRequest<T>(
  path: string,
  walletAddress: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Wallet-Address': walletAddress,
      ...(init?.headers ?? {}),
    },
  });

  const payload = await response.json();

  if (!response.ok || payload.success === false) {
    throw new Error(payload.error || 'Request failed');
  }

  return (payload.data ?? payload) as T;
}

export function buildBuilderSigningPayload(
  type: BuilderOperationType,
  data: Record<string, unknown>,
  timestamp: number,
  expiryWindow: number = 5000
) {
  return {
    timestamp,
    expiry_window: expiryWindow,
    type,
    data,
  };
}

export function buildOrderSigningPayload(
  type: OrderOperationType,
  data: Record<string, unknown>,
  timestamp: number,
  expiryWindow: number = 30000
) {
  return {
    timestamp,
    expiry_window: expiryWindow,
    type,
    data,
  };
}

export function isValidBuilderCode(value: string): boolean {
  return BUILDER_CODE_REGEX.test(value);
}

export function isValidFeeRate(value: string): boolean {
  if (!FEE_RATE_REGEX.test(value)) {
    return false;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed >= 0;
}

export async function fetchBuilderApprovals(walletAddress: string): Promise<BuilderApproval[]> {
  const data = await pacificaRequest<{ approvals: BuilderApproval[] }>(
    '/builder/approvals',
    walletAddress,
    { method: 'GET' }
  );

  return Array.isArray(data.approvals) ? data.approvals : [];
}

export async function fetchAgentStatus(): Promise<AgentStatus> {
  const data = await fetch(`${API_BASE}/agent/status`);
  const payload = await data.json();

  if (!data.ok || payload.success === false) {
    throw new Error(payload.error || 'Failed to fetch agent status');
  }

  return payload.data as AgentStatus;
}
