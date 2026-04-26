'use client';
import React, { useEffect, useState } from 'react';

interface Props {
  text: string;
}

export function AgentSubtitle({ text }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (text) {
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [text]);

  if (!text) return null;

  return (
    <div style={{
      maxWidth: '560px',
      width: '100%',
      textAlign: 'center',
      padding: '0 24px',
      opacity: visible ? 1 : 0,
      transition: 'opacity 400ms ease',
    }}>
      <p style={{
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: '15px',
        fontWeight: 400,
        lineHeight: 1.7,
        color: 'rgba(255,255,255,0.75)',
        letterSpacing: '0.01em',
      }}>
        <span style={{
          display: 'inline-block',
          marginRight: '8px',
          fontSize: '11px',
          fontWeight: 600,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: '#00F5FF',
          opacity: 0.7,
          verticalAlign: 'middle',
        }}>Eera</span>
        {text}
      </p>
    </div>
  );
}