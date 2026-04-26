'use client';
import React from 'react';

interface TopBarProps {
  time: string;
  status: 'Ready' | 'Active' | 'Text Mode';
}

export const TopBar: React.FC<TopBarProps> = ({ time, status }) => {
  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        height: '80px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
        background: 'rgba(0, 0, 0, 0.60)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid #1E1E1E',
        boxShadow: '0 0 30px rgba(0, 245, 255, 0.08)',
      }}
    >
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
        <h1
          style={{
            fontSize: '20px',
            fontWeight: 300,
            letterSpacing: '0.2em',
            color: '#ffffff',
            fontFamily: "'Space Grotesk', sans-serif",
          }}
        >
          Eera
        </h1>
        <span
          style={{
            fontSize: '12px',
            fontWeight: 400,
            letterSpacing: '0.05em',
            color: 'var(--outline)',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          by Zenx
        </span>
      </div>

      {/* Call timer — only shown while active */}
      {status === 'Active' && (
        <span
          style={{
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--primary-container)',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '0.08em',
            fontFamily: 'monospace',
            textShadow: '0 0 8px rgba(0,245,255,0.60)',
          }}
        >
          {time}
        </span>
      )}
    </header>
  );
};
