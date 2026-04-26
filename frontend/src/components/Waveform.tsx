'use client';
import React from 'react';

// Cyan animated waveform bars matching the Stitch agent-speaking design
const BARS = [
  { cls: 'anim-wave-a', height: '48px' },
  { cls: 'anim-wave-b', height: '80px' },
  { cls: 'anim-wave-c', height: '128px' },
  { cls: 'anim-wave-d', height: '64px' },
  { cls: 'anim-wave-e', height: '96px' },
  { cls: 'anim-wave-f', height: '40px' },
  { cls: 'anim-wave-g', height: '56px' },
];

interface WaveformProps {
  active: boolean;
  color?: 'cyan' | 'violet';
}

export const Waveform: React.FC<WaveformProps> = ({ active, color = 'cyan' }) => {
  const barColor = color === 'cyan' ? '#00F5FF' : '#d2bbff';
  const glowColor = color === 'cyan' ? 'rgba(0,245,255,0.8)' : 'rgba(210,187,255,0.8)';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        height: '128px',
        width: '100%',
      }}
    >
      {BARS.map(({ cls, height }, i) => (
        <div
          key={i}
          className={active ? cls : ''}
          style={{
            width: '6px',
            borderRadius: '9999px',
            background: barColor,
            boxShadow: active ? `0 0 12px ${glowColor}` : 'none',
            height: active ? undefined : height,
            minHeight: '4px',
            opacity: active ? 1 : 0.15,
            transition: 'opacity 400ms ease',
          }}
        />
      ))}
    </div>
  );
};
