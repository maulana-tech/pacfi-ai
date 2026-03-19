import React, { useState, useEffect } from 'react';

interface PortfolioData {
  totalBalance: number;
  availableBalance: number;
  totalPnL: number;
  totalROI: number;
  winRate: number;
  sharpeRatio: number;
  maxDrawdown: number;
}

interface Props {
  initialData?: PortfolioData;
}

export default function PortfolioStats({ initialData }: Props) {
  const [portfolio, setPortfolio] = useState<PortfolioData>(
    initialData || {
      totalBalance: 10000,
      availableBalance: 8500,
      totalPnL: 1200,
      totalROI: 12.0,
      winRate: 65,
      sharpeRatio: 1.8,
      maxDrawdown: -8.5,
    }
  );

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number): string => {
    return `${value.toFixed(2)}%`;
  };

  return (
    <div className="bg-white border rounded-lg p-6 shadow">
      <h2 className="font-semibold mb-6">Portfolio Overview</h2>

      <div className="space-y-4">
        <div className="p-4 bg-gray-50 rounded border">
          <p className="text-gray-600 text-sm">Total Balance</p>
          <p className="font-semibold text-lg mt-1">{formatCurrency(portfolio.totalBalance)}</p>
        </div>

        <div className="p-4 bg-gray-50 rounded border">
          <p className="text-gray-600 text-sm">Available Balance</p>
          <p className="font-semibold text-lg mt-1">
            {formatCurrency(portfolio.availableBalance)}
          </p>
        </div>

        <div className="p-4 rounded border" style={{ backgroundColor: '#f0fdf4' }}>
          <p className="text-gray-600 text-sm">Total PnL</p>
          <p className="font-semibold text-lg mt-1" style={{ color: '#10b981' }}>
            {formatCurrency(portfolio.totalPnL)}
          </p>
        </div>

        <div className="p-4 rounded border" style={{ backgroundColor: '#f0fdf4' }}>
          <p className="text-gray-600 text-sm">Total ROI</p>
          <p className="font-semibold text-lg mt-1" style={{ color: '#10b981' }}>
            {formatPercent(portfolio.totalROI)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 bg-gray-50 rounded border">
            <p className="text-gray-600 text-xs">Win Rate</p>
            <p className="font-semibold text-sm mt-1">{formatPercent(portfolio.winRate)}</p>
          </div>

          <div className="p-3 bg-gray-50 rounded border">
            <p className="text-gray-600 text-xs">Sharpe Ratio</p>
            <p className="font-semibold text-sm mt-1">{portfolio.sharpeRatio.toFixed(2)}</p>
          </div>
        </div>

        <div className="p-3 rounded border" style={{ backgroundColor: '#fef2f2' }}>
          <p className="text-gray-600 text-xs">Max Drawdown</p>
          <p className="font-semibold text-sm mt-1" style={{ color: '#ef4444' }}>
            {formatPercent(portfolio.maxDrawdown)}
          </p>
        </div>
      </div>

      <button
        className="w-full mt-6 p-3 rounded font-semibold"
        style={{
          backgroundColor: '#2563eb',
          color: '#ffffff',
        }}
        onMouseEnter={(e) => {
          (e.target as HTMLButtonElement).style.backgroundColor = '#1d4ed8';
        }}
        onMouseLeave={(e) => {
          (e.target as HTMLButtonElement).style.backgroundColor = '#2563eb';
        }}
      >
        Start Trading
      </button>
    </div>
  );
}
