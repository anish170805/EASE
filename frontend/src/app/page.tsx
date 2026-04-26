'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Room,
  RoomEvent,
  ParticipantEvent,
  Track,
  RemoteParticipant,
  RemoteTrackPublication,
  RemoteTrack,
  ConnectionState,
} from 'livekit-client';

import { TopBar } from '@/components/TopBar';
import { VoiceOrb } from '@/components/VoiceOrb';
import { EndCallButton } from '@/components/EndCallButton';

type AppState = 'idle' | 'agent-speaking' | 'user-speaking' | 'processing' | 'complete';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export default function Home() {
  const [state, setState] = useState<AppState>('idle');
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  const roomRef = useRef<Room | null>(null);
  const stateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const time = useMemo(() => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }, [seconds]);

  /* ── Timer ──────────────────────────────────────────────────────── */
  useEffect(() => {
    if (state === 'idle' || state === 'complete') return;
    const id = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [state]);

  useEffect(() => { 
    return () => { 
      roomRef.current?.disconnect(); 
      if (stateTimeoutRef.current) clearTimeout(stateTimeoutRef.current);
    }; 
  }, []);

  /* ── Voice: start call ──────────────────────────────────────────── */
  const startCall = useCallback(async () => {
    setError(null);
    setSeconds(0);
    setState('processing');
    try {
      const res = await fetch(`${BACKEND_URL}/token?room=sales-room&identity=user-${Date.now()}`);
      if (!res.ok) throw new Error(`Token fetch failed: ${res.status}`);
      const { token, url } = await res.json();

      const room = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;

      const updateState = () => {
        const r = roomRef.current;
        if (!r) return;

        const agent = r.remoteParticipants.values().next().value;
        const local = r.localParticipant;

        if (agent?.isSpeaking) {
          if (stateTimeoutRef.current) clearTimeout(stateTimeoutRef.current);
          setState('agent-speaking');
        } else if (local?.isSpeaking) {
          if (stateTimeoutRef.current) clearTimeout(stateTimeoutRef.current);
          setState('user-speaking');
        } else {
          // If no one is speaking, wait a bit before reverting to listening mode
          if (stateTimeoutRef.current) clearTimeout(stateTimeoutRef.current);
          stateTimeoutRef.current = setTimeout(() => {
            setState(prev => {
              // Only switch to listening if we aren't in an idle/complete state
              if (prev === 'agent-speaking') return 'user-speaking';
              return prev;
            });
          }, 2000);
        }
      };

      const handleParticipantEvents = (participant: RemoteParticipant | typeof room.localParticipant) => {
        participant.on(ParticipantEvent.IsSpeakingChanged, () => {
          updateState();
        });
      };

      room.on(RoomEvent.ConnectionStateChanged, (cs: ConnectionState) => {
        if (cs === ConnectionState.Connected) {
          setState('agent-speaking');
          // Start monitoring speakers
          handleParticipantEvents(room.localParticipant);
          room.remoteParticipants.forEach(handleParticipantEvents);
        } else if (cs === ConnectionState.Disconnected) {
          setState('complete');
        }
      });
      room.on(RoomEvent.Disconnected, () => setState('complete'));

      room.on(RoomEvent.ParticipantConnected, (p) => handleParticipantEvents(p as RemoteParticipant));

      room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
        if (track.kind === Track.Kind.Audio) {
          const el = track.attach();
          el.setAttribute('data-livekit-audio', 'true');
          document.body.appendChild(el);
        }
      });
      room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
        if (track.kind === Track.Kind.Audio) track.detach().forEach(el => el.remove());
      });

      await room.connect(url, token);
      await room.localParticipant.setMicrophoneEnabled(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Connection failed');
      setState('idle');
    }
  }, []);

  /* ── Voice: end call ────────────────────────────────────────────── */
  const endCall = useCallback(async () => {
    setState('complete');
    setSeconds(0);
    setIsMuted(false);
    document.querySelectorAll('[data-livekit-audio]').forEach(el => el.remove());
    await roomRef.current?.disconnect();
    roomRef.current = null;
  }, []);

  const toggleMute = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const next = !isMuted;
    await room.localParticipant.setMicrophoneEnabled(!next);
    setIsMuted(next);
  }, [isMuted]);

  const resetToIdle = useCallback(() => { setState('idle'); setError(null); }, []);

  const isActive = state !== 'idle' && state !== 'complete';

  const C = {
    cyan: '#00F5FF',
    font: "'Space Grotesk', sans-serif",
  };

  /* ── MAIN RENDER ────────────────────────────────────────────────── */
  return (
    <>
      <TopBar time={time} status={isActive ? 'Active' : 'Ready'} />

      <main style={{
        position: 'relative', zIndex: 1,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        height: '100vh', paddingTop: '80px',
        background: '#000000',
      }}>
        {/* Error banner */}
        {error && (
          <div style={{
            position: 'fixed', top: '96px', left: '50%', transform: 'translateX(-50%)',
            background: '#7F1D1D', border: '1px solid #991b1b', borderRadius: '8px',
            padding: '12px 24px', color: '#fca5a5',
            fontFamily: C.font, fontSize: '13px', zIndex: 100,
          }}>
            {error}
          </div>
        )}

        {/* IDLE */}
        {state === 'idle' && (
          <div className="anim-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '48px' }}>
            <VoiceOrb state="idle" />

            <h2 style={{
              fontFamily: C.font, fontSize: '24px', fontWeight: 500,
              letterSpacing: '0.3em', textTransform: 'uppercase',
              color: C.cyan, textShadow: '0 0 8px rgba(0,245,255,0.80)',
            }}>
              Ready
            </h2>

            <button
              onClick={startCall}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '16px 48px', borderRadius: '9999px',
                border: `1px solid ${C.cyan}`,
                background: 'rgba(0,0,0,0.40)', backdropFilter: 'blur(12px)',
                color: C.cyan, fontFamily: C.font, fontSize: '12px',
                fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase',
                cursor: 'pointer', boxShadow: '0 0 20px rgba(0,245,255,0.20)',
                transition: 'all 300ms ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 40px rgba(0,245,255,0.50)'; e.currentTarget.style.background = 'rgba(0,245,255,0.10)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 0 20px rgba(0,245,255,0.20)'; e.currentTarget.style.background = 'rgba(0,0,0,0.40)'; }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px', fontVariationSettings: "'wght' 300, 'opsz' 20" }}>
                sensors
              </span>
              Connect
            </button>
          </div>
        )}

        {/* AGENT SPEAKING */}
        {state === 'agent-speaking' && (
          <div className="anim-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', gap: '64px', paddingBottom: '120px' }}>
            <VoiceOrb state="agent-speaking" />
            <h2 style={{ fontFamily: C.font, fontSize: '32px', fontWeight: 500, letterSpacing: '0.15em', color: C.cyan, textShadow: '0 0 15px rgba(0,245,255,0.60)' }}>
              Speaking...
            </h2>
          </div>
        )}

        {/* USER SPEAKING */}
        {state === 'user-speaking' && (
          <div className="anim-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '48px', width: '100%', height: '100%', paddingBottom: '160px' }}>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <div style={{ width: '800px', height: '800px', borderRadius: '9999px', background: C.cyan, opacity: 0.03, filter: 'blur(120px)' }} />
            </div>
            <VoiceOrb state="user-speaking" />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', zIndex: 10 }}>
              <h1 style={{ fontFamily: C.font, fontSize: '48px', fontWeight: 600, letterSpacing: '-0.02em', color: C.cyan, textShadow: '0 0 12px rgba(0,245,255,0.60)' }}>
                Listening...
              </h1>
              <p style={{ fontFamily: C.font, fontSize: '12px', fontWeight: 600, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(0,245,255,0.60)' }}>
                Voice Input Active
              </p>
            </div>
          </div>
        )}

        {/* PROCESSING */}
        {state === 'processing' && (
          <div className="anim-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '48px', width: '100%', height: '100%', paddingBottom: '160px' }}>
            <VoiceOrb state="processing" />
            <span style={{ fontFamily: C.font, fontSize: '24px', fontWeight: 500, letterSpacing: '0.3em', textTransform: 'uppercase', color: C.cyan, textShadow: '0 0 8px rgba(0,245,255,0.80)' }}>
              Connecting...
            </span>
          </div>
        )}

        {/* COMPLETE */}
        {state === 'complete' && (
          <div className="anim-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '80px', width: '100%', maxWidth: '672px', textAlign: 'center', padding: '0 24px' }}>
            <VoiceOrb state="complete" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <h1 style={{ fontFamily: C.font, fontSize: '48px', fontWeight: 600, letterSpacing: '-0.02em', color: C.cyan, lineHeight: 1.1 }}>
                Call Complete.
              </h1>
              <p style={{ fontFamily: C.font, fontSize: '24px', fontWeight: 500, color: 'rgba(255,255,255,0.80)', lineHeight: 1.3 }}>
                Our experts will connect with you shortly.
              </p>
            </div>
            <button
              onClick={resetToIdle}
              style={{
                padding: '12px 48px', border: '1px solid #3a494a',
                background: 'transparent', color: '#ffffff',
                fontFamily: C.font, fontSize: '12px', fontWeight: 600,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                cursor: 'pointer', marginTop: '48px', transition: 'background 200ms ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              Close
            </button>
          </div>
        )}
      </main>

      {isActive && <EndCallButton onEndCall={endCall} onToggleMute={toggleMute} isMuted={isMuted} />}
    </>
  );
}
