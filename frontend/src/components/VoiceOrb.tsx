'use client';
import React from 'react';

type OrbState = 'idle' | 'agent-speaking' | 'user-speaking' | 'processing' | 'complete';

interface VoiceOrbProps {
  state: OrbState;
}

export const VoiceOrb: React.FC<VoiceOrbProps> = ({ state }) => {
  // ── IDLE: Glassmorphic cyan orb with geometric diamond core ──────
  if (state === 'idle') {
    return (
      <div
        style={{
          position: 'relative',
          width: '256px',
          height: '256px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '9999px',
          background: 'rgba(10,10,10,0.60)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid #1E1E1E',
          boxShadow: '0 0 60px rgba(0,245,255,0.10)',
        }}
      >
        {/* Inner gradient bloom */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            margin: 'auto',
            width: '128px',
            height: '128px',
            borderRadius: '9999px',
            background: 'linear-gradient(135deg, #ffffff, #00F5FF, #6001d1)',
            opacity: 0.80,
            filter: 'blur(24px)',
            mixBlendMode: 'screen',
          }}
          className="anim-breathe"
        />
        {/* White core glow */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            margin: 'auto',
            width: '96px',
            height: '96px',
            borderRadius: '9999px',
            background: '#ffffff',
            opacity: 0.90,
            boxShadow: '0 0 40px rgba(255,255,255,1)',
          }}
          className="anim-breathe"
        />
        {/* Rotating diamond core */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            margin: 'auto',
            width: '48px',
            height: '48px',
            border: '1.5px solid var(--primary-container)',
            transform: 'rotate(45deg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.20)',
            backdropFilter: 'blur(8px)',
          }}
          className="anim-spin-dash"
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '9999px',
              background: '#ffffff',
              boxShadow: '0 0 10px rgba(0,245,255,1)',
              transform: 'rotate(-45deg)',
            }}
          />
        </div>
      </div>
    );
  }

  // ── AGENT SPEAKING: Violet orb with cyan waveform ─────────────────
  if (state === 'agent-speaking') {
    return (
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* Violet outer aura */}
        <div
          style={{
            position: 'absolute',
            width: '256px',
            height: '256px',
            borderRadius: '9999px',
            background: '#7C3AED',
            filter: 'blur(100px)',
            opacity: 0.30,
            mixBlendMode: 'screen',
          }}
        />
        {/* Violet glass orb with waveform bars inside */}
        <div
          style={{
            position: 'relative',
            width: '160px',
            height: '160px',
            borderRadius: '9999px',
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            overflow: 'hidden',
          }}
          className="anim-violet-pulse"
        >
          {(['a','b','c','d','e','f','g'] as const).map((k) => (
            <div
              key={k}
              className={`anim-wave-${k}`}
              style={{
                width: '6px',
                borderRadius: '9999px',
                background: '#7C3AED',
                boxShadow: '0 0 8px rgba(124,58,237,0.60)',
                minHeight: '4px',
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  // ── USER SPEAKING (listening): Sonar rings + white orb ────────────
  if (state === 'user-speaking') {
    return (
      <div
        style={{
          position: 'relative',
          width: '320px',
          height: '320px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Subtle ambient glow */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '9999px',
            background: 'rgba(0,245,255,0.03)',
            filter: 'blur(60px)',
          }}
        />
        {/* Outer sonar ring */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '9999px',
            border: '1px solid rgba(0,245,255,0.10)',
            boxShadow: '0 0 60px rgba(0,245,255,0.10)',
          }}
          className="anim-sonar-slow"
        />
        {/* Middle sonar ring */}
        <div
          style={{
            position: 'absolute',
            inset: '32px',
            borderRadius: '9999px',
            border: '1px solid rgba(0,245,255,0.30)',
            boxShadow: '0 0 40px rgba(0,245,255,0.20)',
          }}
          className="anim-sonar"
        />
        {/* Inner sonar ring */}
        <div
          style={{
            position: 'absolute',
            inset: '64px',
            borderRadius: '9999px',
            border: '1px solid rgba(0,245,255,0.60)',
            boxShadow: '0 0 20px rgba(0,245,255,0.40)',
          }}
        />
        {/* Ambient inner glow */}
        <div
          style={{
            position: 'absolute',
            inset: '80px',
            borderRadius: '9999px',
            background: 'rgba(0,245,255,0.10)',
            filter: 'blur(20px)',
          }}
        />
        {/* Core orb */}
        <div
          style={{
            position: 'relative',
            zIndex: 20,
            width: '96px',
            height: '96px',
            borderRadius: '9999px',
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 40px rgba(255,255,255,0.80), 0 0 0 1px rgba(255,255,255,0.50)',
            backdropFilter: 'blur(24px)',
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: '40px',
              color: '#000000',
              fontVariationSettings: "'wght' 200",
            }}
          >
            graphic_eq
          </span>
        </div>
      </div>
    );
  }

  // ── PROCESSING / THINKING: Dashed orbit + white orb ───────────────
  if (state === 'processing') {
    return (
      <div
        style={{
          position: 'relative',
          width: '256px',
          height: '256px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Dashed orbit ring */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '9999px',
            border: '2px dashed rgba(0,245,255,0.40)',
          }}
          className="anim-spin-dash"
        />
        {/* Cyan blur glow */}
        <div
          style={{
            position: 'absolute',
            width: '128px',
            height: '128px',
            borderRadius: '9999px',
            background: '#00F5FF',
            opacity: 0.20,
            filter: 'blur(40px)',
          }}
          className="anim-breathe"
        />
        {/* Core white orb */}
        <div
          style={{
            position: 'relative',
            width: '96px',
            height: '96px',
            borderRadius: '9999px',
            background: 'linear-gradient(135deg, #ffffff, #cccccc)',
            boxShadow: '0 0 30px rgba(255,255,255,0.50)',
          }}
          className="anim-breathe"
        />
      </div>
    );
  }

  // ── COMPLETE: Static mic orb ───────────────────────────────────────
  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: '400px',
          height: '400px',
          borderRadius: '9999px',
          background: 'rgba(255,255,255,0.05)',
          filter: 'blur(100px)',
          position: 'absolute',
        }}
      />
      <div
        style={{
          position: 'relative',
          width: '120px',
          height: '120px',
          borderRadius: '9999px',
          border: '1px solid rgba(255,255,255,0.20)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: '56px',
            color: 'rgba(255,255,255,0.50)',
            fontVariationSettings: "'FILL' 0",
          }}
        >
          mic
        </span>
      </div>
    </div>
  );
};
