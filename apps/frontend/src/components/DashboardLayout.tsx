import React, { useState } from 'react';
import Button from './Button';

interface DashboardLayoutProps {
  children: React.ReactNode;
  walletAddress?: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export default function DashboardLayout({
  children,
  walletAddress,
  onConnect,
  onDisconnect,
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: '📊' },
    { label: 'Trading', href: '/trading', icon: '💹' },
    { label: 'Portfolio', href: '/portfolio', icon: '💼' },
    { label: 'Leaderboard', href: '/leaderboard', icon: '🏆' },
    { label: 'Settings', href: '/settings', icon: '⚙️' },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-white border-r border-gray-200 transition-all duration-300 overflow-hidden`}
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">P</span>
            </div>
            {sidebarOpen && <span className="font-bold text-lg text-gray-900">Pacfi AI</span>}
          </div>
        </div>

        <nav className="p-4 space-y-2">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors ${
                sidebarOpen ? '' : 'justify-center'
              }`}
              title={item.label}
            >
              <span className="text-xl">{item.icon}</span>
              {sidebarOpen && <span className="font-medium">{item.label}</span>}
            </a>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Toggle sidebar"
              >
                {sidebarOpen ? '◀' : '▶'}
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Pacfi AI Trading Bot</h1>
            </div>

            <div className="flex items-center gap-4">
              {walletAddress ? (
                <div className="flex items-center gap-3">
                  <div className="px-4 py-2 bg-gray-100 rounded-lg">
                    <p className="text-sm font-medium text-gray-900">
                      {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                    </p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={onDisconnect}>
                    Disconnect
                  </Button>
                </div>
              ) : (
                <Button variant="primary" size="sm" onClick={onConnect}>
                  Connect Wallet
                </Button>
              )}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-8">{children}</main>
      </div>
    </div>
  );
}
