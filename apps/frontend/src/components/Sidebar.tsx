import React, { useState } from 'react';

interface SidebarProps {
  activeNav?: string;
}

const navItems = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    id: 'trading',
    label: 'Trading',
    href: '/trading',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <polyline points="1,11 5,7 8,9 15,3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points="11,3 15,3 15,7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'portfolio',
    label: 'Portfolio',
    href: '/portfolio',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="4" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M5 4V3a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="1" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    id: 'swarm',
    label: 'AI Swarm',
    href: '/swarm',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="3" cy="4" r="1.5" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="13" cy="4" r="1.5" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="3" cy="12" r="1.5" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="13" cy="12" r="1.5" stroke="currentColor" strokeWidth="1.5" />
        <line x1="5" y1="6" x2="6.5" y2="7" stroke="currentColor" strokeWidth="1.2" />
        <line x1="11" y1="6" x2="9.5" y2="7" stroke="currentColor" strokeWidth="1.2" />
        <line x1="5" y1="11" x2="6.5" y2="9.5" stroke="currentColor" strokeWidth="1.2" />
        <line x1="11" y1="11" x2="9.5" y2="9.5" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    ),
  },
  {
    id: 'leaderboard',
    label: 'Leaderboard',
    href: '/leaderboard',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="9" width="4" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="6" y="5" width="4" height="10" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="11" y="1" width="4" height="14" rx="1" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
];

export default function Sidebar({ activeNav = 'dashboard' }: SidebarProps) {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const connectWallet = async () => {
    setConnecting(true);
    try {
      if (typeof window !== 'undefined' && (window as any).solana?.isPhantom) {
        const resp = await (window as any).solana.connect();
        setWalletAddress(resp.publicKey.toString());
      } else {
        alert('Phantom wallet not found. Please install it from phantom.app');
      }
    } catch (err) {
      console.error('Wallet connect error:', err);
    } finally {
      setConnecting(false);
    }
  };

  const disconnectWallet = async () => {
    if (typeof window !== 'undefined' && (window as any).solana) {
      await (window as any).solana.disconnect();
      setWalletAddress(null);
    }
  };

  const shortAddress = walletAddress
    ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`
    : null;

  return (
    <aside
      style={{
        width: 220,
        minWidth: 220,
        background: '#FFFFFF',
        borderRight: '1px solid #E5E7EB',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'sticky',
        top: 0,
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: '20px 16px 16px',
          borderBottom: '1px solid #F3F4F6',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            background: '#2563EB',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M3 13 L9 5 L15 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="15" cy="9" r="2" fill="white" />
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', lineHeight: 1.2 }}>
            Pacfi AI
          </div>
          <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 500 }}>
            Perpetual Trading
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
        <div style={{ marginBottom: 4 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: '#9CA3AF',
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              padding: '4px 10px 8px',
            }}
          >
            Menu
          </div>
          {navItems.map((item) => {
            const isActive = activeNav === item.id;
            return (
              <a
                key={item.id}
                href={item.href}
                className={`nav-link${isActive ? ' active' : ''}`}
                style={{ marginBottom: 2 }}
              >
                {item.icon}
                <span>{item.label}</span>
              </a>
            );
          })}
        </div>
      </nav>

      {/* Wallet section */}
      <div
        style={{
          padding: '12px 10px',
          borderTop: '1px solid #F3F4F6',
        }}
      >
        {walletAddress ? (
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 10px',
                background: '#F0FDF4',
                borderRadius: 8,
                marginBottom: 8,
                border: '1px solid #D1FAE5',
              }}
            >
              <span className="dot dot-green" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, color: '#6B7280', fontWeight: 600 }}>Connected</div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#111827',
                    fontFamily: 'monospace',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {shortAddress}
                </div>
              </div>
            </div>
            <button
              onClick={disconnectWallet}
              className="btn btn-ghost btn-sm"
              style={{ width: '100%' }}
            >
              Disconnect
            </button>
          </div>
        ) : (
          <button
            onClick={connectWallet}
            disabled={connecting}
            className="btn btn-primary"
            style={{ width: '100%' }}
          >
            {connecting ? (
              <>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  style={{ animation: 'spin 1s linear infinite' }}
                >
                  <circle cx="6" cy="6" r="5" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
                  <path d="M6 1 A5 5 0 0 1 11 6" stroke="white" strokeWidth="2" strokeLinecap="round" />
                </svg>
                Connecting...
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <rect x="1" y="4" width="12" height="8" rx="1.5" stroke="white" strokeWidth="1.5" />
                  <path d="M4 4V3a3 3 0 0 1 6 0v1" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="7" cy="8" r="1.5" fill="white" />
                </svg>
                Connect Wallet
              </>
            )}
          </button>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </aside>
  );
}
