import React, { useState, useEffect } from 'react';

interface SidebarProps {
  activeNav?: string;
}

const navItems = [
  {
    id: 'dashboard',
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
    id: 'builder',
    href: '/builder',
    icon: (
      <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
        <path
          d="M3 8.5L8 2l5 6.5v4A1.5 1.5 0 0 1 11.5 14h-7A1.5 1.5 0 0 1 3 12.5v-4Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M6.25 8.25h3.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M8 6.5v3.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: 'portfolio',
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
  // Use local state only - no mounting delays
  const [activeId, setActiveId] = useState(activeNav);

  // Update active state when prop changes
  useEffect(() => {
    setActiveId(activeNav);
  }, [activeNav]);

  return (
    <aside
      style={{
        width: 100,
        minWidth: 100,
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: '#F8FAFC',
        padding: '24px 0',
      }}
    >
      {/* Logo */}
      <div
        style={{
          width: 52,
          height: 52,
          background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
          borderRadius: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
          marginBottom: 24,
          flexShrink: 0,
        }}
      >
        <svg width="26" height="26" viewBox="0 0 18 18" fill="none">
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

      {/* Menu Container - Height auto, tidak panjang */}
      <nav
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: '#FFFFFF',
            borderRadius: 16,
            padding: 12,
            gap: 6,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04)',
            border: '1px solid rgba(0, 0, 0, 0.05)',
          }}
        >
          {navItems.map((item) => {
            const isActive = activeId === item.id;

            return (
              <a
                key={item.id}
                href={item.href}
                onClick={() => setActiveId(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  textDecoration: 'none',
                  transition: 'all 0.15s ease',
                  background: isActive
                    ? 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)'
                    : 'transparent',
                  color: isActive ? '#FFFFFF' : '#6B7280',
                  boxShadow: isActive ? '0 4px 12px rgba(37, 99, 235, 0.3)' : 'none',
                }}
              >
                {item.icon}
              </a>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
