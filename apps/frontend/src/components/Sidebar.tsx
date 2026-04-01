import React, { useState, useEffect } from 'react';

interface SidebarProps {
  activeNav?: string;
}

const navItems = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    icon: (
      <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
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
      <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
        <polyline
          points="1,11 5,7 8,9 15,3"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polyline
          points="11,3 15,3 15,7"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: 'portfolio',
    label: 'Portfolio',
    href: '/portfolio',
    icon: (
      <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="4" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M5 4V3a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <line x1="1" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    id: 'swarm',
    label: 'AI Swarm',
    href: '/swarm',
    icon: (
      <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
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
      <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
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
  const [mounted, setMounted] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);

    const wasConnected = localStorage.getItem('phantom_wallet_connected');
    if (wasConnected === 'true') {
      setTimeout(() => {
        if (typeof window !== 'undefined' && (window as any).solana?.isPhantom) {
          (window as any).solana
            .connect({ onlyIfTrusted: true })
            .then((resp: any) => {
              setWalletAddress(resp.publicKey.toString());
            })
            .catch(() => {
              localStorage.removeItem('phantom_wallet_connected');
            });
        }
      }, 500);
    }
  }, []);

  const connectWallet = async () => {
    setConnecting(true);
    try {
      if (typeof window !== 'undefined' && (window as any).solana?.isPhantom) {
        const resp = await (window as any).solana.connect();
        setWalletAddress(resp.publicKey.toString());
        localStorage.setItem('phantom_wallet_connected', 'true');
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
      localStorage.removeItem('phantom_wallet_connected');
    }
  };

  const shortAddress = walletAddress
    ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`
    : null;

  if (!mounted) {
    return <aside style={{ width: 80, minWidth: 80 }} />;
  }

  return (
    <aside
      style={{
        width: 80,
        minWidth: 80,
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        background: 'linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)',
        borderRight: '1px solid #E2E8F0',
        overflow: 'hidden',
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: '20px 16px 16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
          }}
        >
          <svg width="22" height="22" viewBox="0 0 18 18" fill="none">
            <path
              d="M3 13 L9 5 L15 9"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="15" cy="9" r="2" fill="white" />
          </svg>
        </div>
      </div>

      {/* Navigation Icons - Centered */}
      <nav
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 8,
          padding: '16px 0',
        }}
      >
        {navItems.map((item) => {
          const isActive = activeNav === item.id;
          const isHovered = hoveredItem === item.id;

          return (
            <a
              key={item.id}
              href={item.href}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 48,
                height: 48,
                borderRadius: 14,
                textDecoration: 'none',
                transition: 'all 0.2s ease',
                background: isActive
                  ? 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)'
                  : '#FFFFFF',
                color: isActive ? '#FFFFFF' : '#6B7280',
                boxShadow: isActive
                  ? '0 4px 12px rgba(37, 99, 235, 0.3)'
                  : isHovered
                    ? '0 4px 12px rgba(0, 0, 0, 0.08)'
                    : '0 2px 8px rgba(0, 0, 0, 0.04)',
                transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
                border: isActive ? 'none' : '1px solid #E5E7EB',
              }}
              onMouseEnter={() => setHoveredItem(item.id)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              {item.icon}

              {/* Tooltip */}
              {(isHovered || isActive) && (
                <div
                  style={{
                    position: 'absolute',
                    left: '100%',
                    marginLeft: 12,
                    background: isActive ? '#1D4ED8' : '#1F2937',
                    color: '#FFFFFF',
                    padding: '6px 12px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                    zIndex: 1000,
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    animation: 'fadeIn 0.15s ease',
                  }}
                >
                  {item.label}
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: -6,
                      transform: 'translateY(-50%)',
                      width: 0,
                      height: 0,
                      borderTop: '5px solid transparent',
                      borderBottom: '5px solid transparent',
                      borderRight: `6px solid ${isActive ? '#1D4ED8' : '#1F2937'}`,
                    }}
                  />
                </div>
              )}
            </a>
          );
        })}
      </nav>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-4px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </aside>
  );
}
