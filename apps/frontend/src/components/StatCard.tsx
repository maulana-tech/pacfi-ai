import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  change?: number;
  icon?: React.ReactNode;
  className?: string;
}

export default function StatCard({ label, value, change, icon, className = '' }: StatCardProps) {
  const isPositive = change && change >= 0;

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-2">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {change !== undefined && (
            <p className={`text-sm font-medium mt-2 ${isPositive ? 'text-success' : 'text-danger'}`}>
              {isPositive ? '+' : ''}{change}%
            </p>
          )}
        </div>
        {icon && <div className="text-gray-400 ml-4">{icon}</div>}
      </div>
    </div>
  );
}
