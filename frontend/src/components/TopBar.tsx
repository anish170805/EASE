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
      {/* Left: Brand */}
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

      {/* Right: Timer + Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
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
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            aria-label="Call History"
            style={{
              padding: '8px',
              background: 'transparent',
              border: 'none',
              borderRadius: '6px',
              color: 'rgba(255,255,255,0.40)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              transition: 'color 300ms ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--primary-container)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.40)')}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: "'wght' 200, 'opsz' 24" }}
            >
              history
            </span>
          </button>
          <button
            aria-label="Settings"
            style={{
              padding: '8px',
              background: 'transparent',
              border: 'none',
              borderRadius: '6px',
              color: 'rgba(255,255,255,0.40)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              transition: 'color 300ms ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--primary-container)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.40)')}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: "'wght' 200, 'opsz' 24" }}
            >
              settings
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
