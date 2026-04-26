'use client';
import React from 'react';

// Left-side nav — collapsed icon rail, expands on hover (desktop only)
export const NavRail: React.FC = () => {
  return (
    <nav
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        width: '80px',
        zIndex: 40,
        display: 'flex',
        flexDirection: 'column',
        paddingTop: '80px',           // below topbar
        paddingBottom: '32px',
        background: 'rgba(0,0,0,0.80)',
        backdropFilter: 'blur(32px)',
        WebkitBackdropFilter: 'blur(32px)',
        borderRight: '1px solid #1E1E1E',
        overflow: 'hidden',
        transition: 'width 500ms cubic-bezier(0.4,0,0.2,1)',
      }}
      className="nav-rail"
      onMouseEnter={e => (e.currentTarget.style.width = '256px')}
      onMouseLeave={e => (e.currentTarget.style.width = '80px')}
    >
      {/* Nav Items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '16px', flex: 1 }}>
        <NavItem icon="graphic_eq" label="Assistant" active />
        <NavItem icon="receipt_long" label="Archive" />
        <NavItem icon="query_stats" label="Analytics" />
        <NavItem icon="face_6" label="Identity" />
      </div>

      {/* Footer */}
      <div
        className="nav-footer"
        style={{
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          opacity: 0,
          transition: 'opacity 300ms ease',
          whiteSpace: 'nowrap',
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '9999px',
            background: 'var(--surface-container)',
            border: '1px solid var(--outline-variant)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: '16px', fontVariationSettings: "'wght' 200" }}
          >
            person
          </span>
        </div>
        <div>
          <div
            style={{
              color: 'var(--primary-container)',
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: '11px',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            Eera OS
          </div>
          <div
            style={{
              color: 'rgba(255,255,255,0.30)',
              fontSize: '10px',
              letterSpacing: '0.12em',
              marginTop: '2px',
            }}
          >
            V 2.0.4
          </div>
        </div>
      </div>

      <style>{`
        .nav-rail:hover .nav-footer { opacity: 1 !important; }
      `}</style>
    </nav>
  );
};

interface NavItemProps {
  icon: string;
  label: string;
  active?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active }) => {
  return (
    <a
      href="#"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
        padding: '16px 0 16px 28px',
        color: active ? 'var(--primary-container)' : 'rgba(255,255,255,0.30)',
        borderLeft: active ? '2px solid var(--primary-container)' : '2px solid transparent',
        transition: 'color 200ms ease, background 200ms ease',
        textDecoration: 'none',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
      }}
      onMouseEnter={e => {
        if (!active) {
          e.currentTarget.style.background = '#1E1E1E';
          e.currentTarget.style.color = '#ffffff';
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'rgba(255,255,255,0.30)';
        }
      }}
    >
      <span
        className="material-symbols-outlined"
        style={{
          fontSize: '22px',
          flexShrink: 0,
          fontVariationSettings: "'wght' 200, 'opsz' 24",
        }}
      >
        {icon}
      </span>
      <span
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: '11px',
          fontWeight: 500,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
    </a>
  );
};
