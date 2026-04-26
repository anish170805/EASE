'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  const [time, setTime] = useState('00:00');
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  const roomRef = useRef<Room | null>(null);

  /* ── Timer ─────────────────────────────────────────────────────── */
  useEffect(() => {
    if (state === 'idle' || state === 'complete') return;
    const id = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [state]);

  useEffect(() => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    setTime(`${m}:${s}`);
  }, [seconds]);

  /* ── Cleanup on unmount ─────────────────────────────────────────── */
  useEffect(() => {
    return () => {
      roomRef.current?.disconnect();
    };
  }, []);

  /* ── Start call: fetch token → connect LiveKit room ─────────────── */
  const startCall = useCallback(async () => {
    setError(null);
    setSeconds(0);
    setState('processing');

    try {
      const res = await fetch(`${BACKEND_URL}/token?room=sales-room&identity=user-${Date.now()}`);
      if (!res.ok) throw new Error(`Token fetch failed: ${res.status}`);
      const { token, url } = await res.json();

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });
      roomRef.current = room;

      /* ── Room-level events ─────────────────────────────────────── */
      room.on(RoomEvent.ConnectionStateChanged, (cs: ConnectionState) => {
        if (cs === ConnectionState.Connected) {
          setState('agent-speaking');
        } else if (cs === ConnectionState.Disconnected) {
          setState('complete');
        }
      });

      room.on(RoomEvent.Disconnected, () => {
        setState('complete');
      });

      /* ── Agent participant events ───────────────────────────────── */
      const handleAgentParticipant = (participant: RemoteParticipant) => {
        // Agent track published → agent is speaking
        participant.on(ParticipantEvent.TrackPublished, (pub: RemoteTrackPublication) => {
          if (pub.kind === Track.Kind.Audio) {
            setState('agent-speaking');
          }
        });

        // Agent track unpublished → agent done, now listening
        participant.on(ParticipantEvent.TrackUnpublished, (pub: RemoteTrackPublication) => {
          if (pub.kind === Track.Kind.Audio) {
            setState('user-speaking');
          }
        });

        // Agent speaking indicator
        participant.on(ParticipantEvent.IsSpeakingChanged, (speaking: boolean) => {
          if (speaking) {
            setState('agent-speaking');
          } else {
            // Brief processing gap before listening
            setTimeout(() => {
              setState(prev => prev === 'agent-speaking' ? 'user-speaking' : prev);
            }, 300);
          }
        });
      };

      // Wire up existing + future agent participants
      room.remoteParticipants.forEach(handleAgentParticipant);
      room.on(RoomEvent.ParticipantConnected, (p: RemoteParticipant) => {
        handleAgentParticipant(p);
      });

      /* ── Attach agent audio to DOM so it plays ───────────────────── */
      room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, _pub, _participant) => {
        if (track.kind === Track.Kind.Audio) {
          const audioEl = track.attach();
          audioEl.setAttribute('data-livekit-audio', 'true');
          document.body.appendChild(audioEl);
        }
      });

      room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
        if (track.kind === Track.Kind.Audio) {
          track.detach().forEach(el => el.remove());
        }
      });

      /* ── Local mic speaking detection ──────────────────────────── */
      room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        const localIsSpeaking = speakers.some(s => s.identity === room.localParticipant?.identity);
        if (localIsSpeaking) {
          setState('user-speaking');
        }
      });

      /* ── Connect ───────────────────────────────────────────────── */
      await room.connect(url, token);

      // Enable local mic
      await room.localParticipant.setMicrophoneEnabled(true);

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Connection failed';
      setError(msg);
      setState('idle');
    }
  }, []);

  /* ── End call ───────────────────────────────────────────────────── */
  const endCall = useCallback(async () => {
    // Immediately show complete screen — don't wait for async disconnect
    setState('complete');
    setSeconds(0);
    setTime('00:00');
    setIsMuted(false);
    // Cleanup audio elements & room in background
    document.querySelectorAll('[data-livekit-audio]').forEach(el => el.remove());
    await roomRef.current?.disconnect();
    roomRef.current = null;
  }, []);

  /* ── Mute / Unmute ──────────────────────────────────────────────── */
  const toggleMute = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const next = !isMuted;
    await room.localParticipant.setMicrophoneEnabled(!next);
    setIsMuted(next);
  }, [isMuted]);

  const resetToIdle = useCallback(() => {
    setState('idle');
    setError(null);
  }, []);

  const isActive = state !== 'idle' && state !== 'complete';

  return (
    <>
      <TopBar time={time} status={isActive ? 'Active' : 'Ready'} />

      <main
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          paddingTop: '80px',
          background: '#000000',
        }}
      >
        {/* ── ERROR BANNER ───────────────────────────────────────── */}
        {error && (
          <div
            style={{
              position: 'fixed',
              top: '96px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#7F1D1D',
              border: '1px solid #991b1b',
              borderRadius: '8px',
              padding: '12px 24px',
              color: '#fca5a5',
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '13px',
              zIndex: 100,
            }}
          >
            {error}
          </div>
        )}

        {/* ── IDLE ───────────────────────────────────────────────── */}
        {state === 'idle' && (
          <div className="anim-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '80px' }}>
            <VoiceOrb state="idle" />

            <div style={{ textAlign: 'center' }}>
              <h2
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: '24px',
                  fontWeight: 500,
                  letterSpacing: '0.3em',
                  textTransform: 'uppercase',
                  color: '#00F5FF',
                  textShadow: '0 0 8px rgba(0,245,255,0.80)',
                  lineHeight: 1.3,
                }}
              >
                Ready
              </h2>
            </div>

            <button
              id="start-session-btn"
              onClick={startCall}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px 48px',
                borderRadius: '9999px',
                border: '1px solid #00F5FF',
                background: 'rgba(0,0,0,0.40)',
                backdropFilter: 'blur(12px)',
                color: '#00F5FF',
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: '12px',
                fontWeight: 600,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                boxShadow: '0 0 20px rgba(0,245,255,0.20)',
                transition: 'all 300ms ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.boxShadow = '0 0 40px rgba(0,245,255,0.50)';
                e.currentTarget.style.background = 'rgba(0,245,255,0.10)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.boxShadow = '0 0 20px rgba(0,245,255,0.20)';
                e.currentTarget.style.background = 'rgba(0,0,0,0.40)';
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '16px', fontVariationSettings: "'wght' 300, 'opsz' 20" }}
              >
                sensors
              </span>
              Connect
            </button>
          </div>
        )}

        {/* ── AGENT SPEAKING ─────────────────────────────────────── */}
        {state === 'agent-speaking' && (
          <div
            className="anim-fade-in"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
              gap: '64px',
              paddingBottom: '120px',
            }}
          >
            <VoiceOrb state="agent-speaking" />
            <h2
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: '32px',
                fontWeight: 500,
                letterSpacing: '0.15em',
                color: '#00F5FF',
                textShadow: '0 0 15px rgba(0,245,255,0.60)',
              }}
            >
              Speaking...
            </h2>
          </div>
        )}

        {/* ── USER SPEAKING ──────────────────────────────────────── */}
        {state === 'user-speaking' && (
          <div
            className="anim-fade-in"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '48px',
              width: '100%',
              height: '100%',
              paddingBottom: '160px',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
              }}
            >
              <div
                style={{
                  width: '800px',
                  height: '800px',
                  borderRadius: '9999px',
                  background: '#00F5FF',
                  opacity: 0.03,
                  filter: 'blur(120px)',
                }}
              />
            </div>

            <VoiceOrb state="user-speaking" />

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', zIndex: 10 }}>
              <h1
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: '48px',
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                  color: '#00F5FF',
                  textShadow: '0 0 12px rgba(0,245,255,0.60)',
                }}
              >
                Listening...
              </h1>
              <p
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: '12px',
                  fontWeight: 600,
                  letterSpacing: '0.3em',
                  textTransform: 'uppercase',
                  color: 'rgba(0,245,255,0.60)',
                }}
              >
                Voice Input Active
              </p>
            </div>
          </div>
        )}

        {/* ── PROCESSING ─────────────────────────────────────────── */}
        {state === 'processing' && (
          <div
            className="anim-fade-in"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '48px',
              width: '100%',
              height: '100%',
              paddingBottom: '160px',
            }}
          >
            <VoiceOrb state="processing" />
            <span
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: '24px',
                fontWeight: 500,
                letterSpacing: '0.3em',
                textTransform: 'uppercase',
                color: '#00F5FF',
                textShadow: '0 0 8px rgba(0,245,255,0.80)',
              }}
            >
              Connecting...
            </span>
          </div>
        )}

        {/* ── COMPLETE ───────────────────────────────────────────── */}
        {state === 'complete' && (
          <div
            className="anim-fade-in"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '80px',
              width: '100%',
              maxWidth: '672px',
              textAlign: 'center',
              padding: '0 24px',
            }}
          >
            <VoiceOrb state="complete" />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <h1
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: '48px',
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                  color: '#00F5FF',
                  lineHeight: 1.1,
                }}
              >
                Call Complete.
              </h1>
              <p
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: '24px',
                  fontWeight: 500,
                  color: 'rgba(255,255,255,0.80)',
                  lineHeight: 1.3,
                }}
              >
                Our experts will connect with you shortly.
              </p>
            </div>

            <button
              id="new-session-btn"
              onClick={resetToIdle}
              style={{
                padding: '12px 48px',
                border: '1px solid #3a494a',
                background: 'transparent',
                color: '#ffffff',
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: '12px',
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                marginTop: '48px',
                transition: 'background 200ms ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              Close
            </button>
          </div>
        )}
      </main>

      {isActive && (
        <EndCallButton
          onEndCall={endCall}
          onToggleMute={toggleMute}
          isMuted={isMuted}
        />
      )}
    </>
  );
}
