'use client';
import React, { useState, useRef } from 'react';

interface Props {
  onSend: (message: string) => void;
  disabled?: boolean;
  loading?: boolean;
}

export function TextInputBar({ onSend, disabled, loading }: Props) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const send = () => {
    const text = input.trim();
    if (!text || disabled || loading) return;
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    onSend(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      padding: '16px 24px 24px',
      background: 'linear-gradient(to top, #000000 60%, transparent)',
      display: 'flex',
      justifyContent: 'center',
      zIndex: 40,
    }}>
      <div style={{
        width: '100%',
        maxWidth: '600px',
        display: 'flex',
        gap: '10px',
        alignItems: 'flex-end',
        background: 'rgba(13,21,21,0.95)',
        border: '1px solid rgba(0,245,255,0.2)',
        borderRadius: '16px',
        padding: '6px 6px 6px 16px',
        boxShadow: '0 0 30px rgba(0,245,255,0.08)',
      }}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => {
            setInput(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
          }}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? 'Call ended' : 'Type a message...'}
          disabled={disabled}
          rows={1}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            resize: 'none',
            color: 'rgba(255,255,255,0.85)',
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '14px',
            lineHeight: 1.5,
            padding: '8px 0',
            maxHeight: '100px',
            overflowY: 'auto',
          }}
        />
        <button
          onClick={send}
          disabled={disabled || !input.trim() || loading}
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            border: 'none',
            background: (!input.trim() || disabled || loading)
              ? 'rgba(0,245,255,0.06)'
              : '#00F5FF',
            color: (!input.trim() || disabled || loading)
              ? 'rgba(0,245,255,0.25)'
              : '#000',
            cursor: (!input.trim() || disabled || loading) ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'all 200ms',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>
            {loading ? 'hourglass_empty' : 'send'}
          </span>
        </button>
      </div>
    </div>
  );
}