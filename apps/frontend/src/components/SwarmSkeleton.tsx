import React from 'react';

interface SwarmSkeletonProps {
  height?: number;
}

export default function SwarmSkeleton({ height = 400 }: SwarmSkeletonProps) {
  return (
    <div
      style={{
        width: '100%',
        height: `${height}px`,
        background: '#FAFAFA',
        borderRadius: '8px',
        position: 'relative',
        overflow: 'hidden',
        backgroundImage: 'radial-gradient(#E0E0E0 1.5px, transparent 1.5px)',
        backgroundSize: '24px 24px',
      }}
    >
      {/* Central node skeleton */}
      <div
        className="skeleton"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 44,
          height: 44,
          borderRadius: '50%',
          backgroundColor: '#E5E7EB',
        }}
      />

      {/* Surrounding nodes skeleton */}
      {[
        { top: '20%', left: '50%' },
        { top: '50%', left: '20%' },
        { top: '50%', left: '80%' },
      ].map((pos, i) => (
        <div
          key={i}
          className="skeleton"
          style={{
            position: 'absolute',
            top: pos.top,
            left: pos.left,
            transform: 'translate(-50%, -50%)',
            width: 36,
            height: 36,
            borderRadius: '50%',
            backgroundColor: '#E5E7EB',
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}

      {/* Loading text */}
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          color: '#9CA3AF',
          fontSize: 13,
          fontWeight: 500,
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          style={{ animation: 'spin 1s linear infinite' }}
        >
          <circle
            cx="8"
            cy="8"
            r="6"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            strokeDasharray="20"
            strokeDashoffset="10"
          />
        </svg>
        Loading visualization...
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
