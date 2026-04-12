import React, { useEffect, useState } from 'react';
import { useWalletContext } from './WalletConnect';
import {
  buildBuilderSigningPayload,
  buildMessageToSign,
  BuilderApproval,
  fetchBuilderApprovals,
  isValidBuilderCode,
  isValidFeeRate,
  pacificaRequest,
} from '../lib/pacifica';

export default function BuilderContent() {
  const { walletAddress, isConnected, signMessage } = useWalletContext();
  const [builderCode, setBuilderCode] = useState('');
  const [feeRate, setFeeRate] = useState('0.001');
  const [approvals, setApprovals] = useState<BuilderApproval[]>([]);
  const [busy, setBusy] = useState<'approve' | 'revoke' | 'update' | 'refresh' | null>(null);
  const [notice, setNotice] = useState('');

  async function loadApprovals(currentWallet: string) {
    setBusy('refresh');
    try {
      const nextApprovals = await fetchBuilderApprovals(currentWallet);
      setApprovals(nextApprovals);

      if (!builderCode && nextApprovals[0]) {
        setBuilderCode(nextApprovals[0].builder_code);
        if (nextApprovals[0].max_fee_rate) {
          setFeeRate(nextApprovals[0].max_fee_rate);
        }
      }
    } finally {
      setBusy(null);
    }
  }

  useEffect(() => {
    if (!isConnected || !walletAddress) {
      setApprovals([]);
      return;
    }

    loadApprovals(walletAddress).catch((error) => {
      setNotice(error instanceof Error ? error.message : 'Failed to load approvals.');
    });
  }, [isConnected, walletAddress]);

  function validate(): string {
    if (!walletAddress || !isConnected) {
      return 'Connect your wallet first.';
    }

    if (!isValidBuilderCode(builderCode)) {
      return 'Builder code must be alphanumeric and max 16 characters.';
    }

    if (!isValidFeeRate(feeRate)) {
      return 'Fee rate must be a decimal like 0.001.';
    }

    return '';
  }

  async function runSignedAction(
    nextBusy: 'approve' | 'revoke' | 'update',
    type: 'approve_builder_code' | 'revoke_builder_code' | 'update_builder_code_fee_rate',
    path: '/builder/approve' | '/builder/revoke' | '/builder/update-fee-rate',
    payloadData: Record<string, unknown>,
    body: Record<string, unknown>,
    successMessage: string
  ) {
    const error = validate();
    if (error || !walletAddress) {
      setNotice(error);
      return;
    }

    setBusy(nextBusy);
    setNotice('');

    try {
      const timestamp = Date.now();
      const expiryWindow = 5000;
      const signature = await signMessage(
        buildMessageToSign(buildBuilderSigningPayload(type, payloadData, timestamp, expiryWindow))
      );

      await pacificaRequest(path, walletAddress, {
        method: 'POST',
        body: JSON.stringify({
          ...body,
          signature,
          timestamp,
          expiryWindow,
        }),
      });

      await loadApprovals(walletAddress);
      setNotice(successMessage);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Builder action failed.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ padding: '24px 28px', display: 'grid', gap: 16 }}>
      <div
        className="card"
        style={{
          padding: 22,
          background:
            'linear-gradient(135deg, #0F2742 0%, #19456F 52%, #D97706 100%)',
          color: '#F8FAFC',
        }}
      >
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#BFDBFE' }}>
            Builder Program
          </div>
          <h2 style={{ fontSize: 30, lineHeight: 1.1, color: '#FFFFFF' }}>Onboarding builder sesuai alur Pacifica</h2>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: '#E2E8F0', margin: 0, maxWidth: 760 }}>
            Wallet address diambil dari wallet yang terhubung. Code name dibatasi 16 karakter alfanumerik, fee rate
            ditandatangani melalui payload approval, lalu approval itu bisa direfresh, diubah, atau dicabut dari satu
            tempat khusus.
          </p>
        </div>
      </div>

      <div className="builder-layout">
        <div className="card" style={{ padding: 18, display: 'grid', gap: 14 }}>
          <div className="card-title">Builder Submission</div>

          <div className="builder-form-grid">
            <div>
              <div className="input-label" style={{ marginBottom: 6 }}>Pacifica wallet address</div>
              <div className="input-field" style={{ background: '#F9FAFB', color: '#6B7280' }}>
                {walletAddress || 'Connect wallet from the header first'}
              </div>
            </div>

            <div>
              <div className="input-label" style={{ marginBottom: 6 }}>Code Name Preference</div>
              <input
                className="input-field"
                value={builderCode}
                onChange={(e) => setBuilderCode(e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 16))}
                placeholder="PACFIAI01"
              />
            </div>

            <div>
              <div className="input-label" style={{ marginBottom: 6 }}>Fee Rate</div>
              <input
                className="input-field"
                value={feeRate}
                onChange={(e) => setFeeRate(e.target.value.trim())}
                placeholder="0.001"
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary"
              disabled={busy !== null}
              onClick={() =>
                runSignedAction(
                  'approve',
                  'approve_builder_code',
                  '/builder/approve',
                  { builder_code: builderCode, max_fee_rate: feeRate },
                  { builderCode, maxFeeRate: feeRate },
                  `Builder code ${builderCode} approved.`
                )
              }
            >
              Approve Builder Code
            </button>
            <button
              className="btn"
              style={{ background: '#EFF6FF', color: '#1D4ED8' }}
              disabled={busy !== null}
              onClick={() =>
                runSignedAction(
                  'update',
                  'update_builder_code_fee_rate',
                  '/builder/update-fee-rate',
                  { builder_code: builderCode, fee_rate: feeRate },
                  { builderCode, feeRate },
                  `Fee rate for ${builderCode} updated.`
                )
              }
            >
              Update Fee Rate
            </button>
            <button
              className="btn btn-ghost"
              disabled={busy !== null}
              onClick={() =>
                runSignedAction(
                  'revoke',
                  'revoke_builder_code',
                  '/builder/revoke',
                  { builder_code: builderCode },
                  { builderCode },
                  `Builder code ${builderCode} revoked.`
                )
              }
            >
              Revoke
            </button>
            <button
              className="btn btn-ghost"
              disabled={busy !== null || !walletAddress}
              onClick={() => {
                if (!walletAddress) return;
                loadApprovals(walletAddress).catch((error) => {
                  setNotice(error instanceof Error ? error.message : 'Failed to refresh approvals.');
                });
              }}
            >
              Refresh
            </button>
          </div>

          {notice ? (
            <div
              style={{
                borderRadius: 10,
                padding: '12px 14px',
                background: '#ECFDF5',
                color: '#065F46',
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              {notice}
            </div>
          ) : null}
        </div>

        <div className="card" style={{ padding: 18, display: 'grid', gap: 14 }}>
          <div className="card-title">Approved Builder Codes</div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: 10,
            }}
          >
            <div className="stat-card" style={{ padding: 14 }}>
              <div className="stat-label">Connected Wallet</div>
              <div className="stat-value" style={{ fontSize: 14 }}>
                {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'Not connected'}
              </div>
            </div>
            <div className="stat-card" style={{ padding: 14 }}>
              <div className="stat-label">Approved Codes</div>
              <div className="stat-value">{approvals.length}</div>
            </div>
            <div className="stat-card" style={{ padding: 14 }}>
              <div className="stat-label">Selected Code</div>
              <div className="stat-value" style={{ fontSize: 14 }}>{builderCode || '-'}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            {approvals.length > 0 ? (
              approvals.map((approval) => (
                <button
                  key={approval.builder_code}
                  onClick={() => {
                    setBuilderCode(approval.builder_code);
                    if (approval.max_fee_rate) {
                      setFeeRate(approval.max_fee_rate);
                    }
                  }}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 14px',
                    borderRadius: 10,
                    border:
                      approval.builder_code === builderCode
                        ? '1px solid #2563EB'
                        : '1px solid #E5E7EB',
                    background:
                      approval.builder_code === builderCode ? '#EFF6FF' : '#FFFFFF',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{approval.builder_code}</span>
                  <span style={{ fontSize: 12, color: '#6B7280' }}>
                    max fee {approval.max_fee_rate || '-'}
                  </span>
                </button>
              ))
            ) : (
              <div
                style={{
                  border: '1px dashed #D1D5DB',
                  borderRadius: 10,
                  padding: 14,
                  fontSize: 13,
                  color: '#6B7280',
                }}
              >
                Belum ada builder code yang di-approve untuk wallet ini.
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .builder-layout {
          display: grid;
          grid-template-columns: minmax(0, 1.05fr) minmax(320px, 0.95fr);
          gap: 14px;
        }

        .builder-form-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        @media (max-width: 1080px) {
          .builder-layout {
            grid-template-columns: 1fr;
          }

          .builder-form-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
