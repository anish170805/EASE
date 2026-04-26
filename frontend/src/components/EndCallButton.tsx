'use client';
import React from 'react';

interface CallControlsProps {
  onEndCall: () => void;
  onToggleMute: () => void;
  isMuted: boolean;
}

export const EndCallButton: React.FC<CallControlsProps> = ({ onEndCall, onToggleMute, isMuted }) => {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '64px',
        left: 0,
        right: 0,
        zIndex: 50,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '20px',
        pointerEvents: 'none',
      }}
    >
      {/* ── Mute / Unmute ─────────────────────────────────────── */}
      <button
        id="mute-btn"
        onClick={onToggleMute}
        title={isMuted ? 'Unmute' : 'Mute'}
        style={{
          pointerEvents: 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          padding: '20px 32px',
          background: isMuted ? 'rgba(234,179,8,0.15)' : 'rgba(255,255,255,0.06)',
          border: `1px solid ${isMuted ? 'rgba(234,179,8,0.60)' : 'rgba(255,255,255,0.15)'}`,
          borderRadius: '9999px',
          color: isMuted ? '#FBBF24' : 'rgba(255,255,255,0.80)',
          fontSize: '12px',
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 600,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          backdropFilter: 'blur(12px)',
          boxShadow: isMuted
            ? '0 0 24px rgba(234,179,8,0.20)'
            : '0 0 24px rgba(0,0,0,0.40)',
          transition: 'all 250ms ease',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = isMuted
            ? 'rgba(234,179,8,0.25)'
            : 'rgba(255,255,255,0.12)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = isMuted
            ? 'rgba(234,179,8,0.15)'
            : 'rgba(255,255,255,0.06)';
        }}
        onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.95)'; }}
        onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
      >
        <span
          className="material-symbols-outlined"
          style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}
        >
          {isMuted ? 'mic_off' : 'mic'}
        </span>
        {isMuted ? 'Unmute' : 'Mute'}
      </button>

      {/* ── End Call ──────────────────────────────────────────── */}
      <button
        id="end-call-btn"
        onClick={onEndCall}
        style={{
          pointerEvents: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '20px 40px',
          background: '#7F1D1D',
          border: '1px solid #7F1D1D',
          borderRadius: '9999px',
          color: '#ffffff',
          fontSize: '12px',
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 600,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          boxShadow: '0 0 40px rgba(127,29,29,0.40)',
          transition: 'all 300ms ease',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = '#991b1b';
          e.currentTarget.style.boxShadow = '0 0 60px rgba(153,27,27,0.60)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = '#7F1D1D';
          e.currentTarget.style.boxShadow = '0 0 40px rgba(127,29,29,0.40)';
        }}
        onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.96)'; }}
        onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
      >
        <span
          className="material-symbols-outlined"
          style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}
        >
          call_end
        </span>
        END CALL
      </button>
    </div>
  );
};
