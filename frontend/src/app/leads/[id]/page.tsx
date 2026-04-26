'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

interface Lead {
  id?: string | number;
  captured_at: string;
  lead_score: number;
  priority: 'high' | 'medium' | 'low';
  name: string;
  company: string;
  service: string;
  budget: string;
  timeline: string;
  contact: string;
}

const C = {
  cyan:       '#00F5FF',
  cyanDim:    'rgba(0,245,255,0.60)',
  cyanFaint:  'rgba(0,245,255,0.08)',
  cyanGlow:   '0 0 20px rgba(0,245,255,0.25)',
  gold:       '#E7C427',
  surfaceLow: '#0d1212',
  border:     '#1E2828',
  borderDim:  '#162020',
  font:       "'Space Grotesk', sans-serif",
  mono:       "'Courier New', monospace",
};

const PRIORITY_CONFIG: Record<string, { color: string; glow: string; label: string }> = {
  high:   { color: C.cyan,   glow: '0 0 12px rgba(0,245,255,0.50)',   label: 'HIGH' },
  medium: { color: C.gold,   glow: '0 0 12px rgba(231,196,39,0.40)',  label: 'MED'  },
  low:    { color: '#849495', glow: 'none',                            label: 'LOW'  },
};

function DetailItem({ label, value, icon, mono = false }: { label: string; value: string; icon: string; mono?: boolean }) {
  return (
    <div style={{
      padding: '24px',
      background: 'rgba(255,255,255,0.02)',
      border: `1px solid ${C.border}`,
      borderRadius: 12,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'rgba(255,255,255,0.30)' }}>
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ fontFamily: C.font, fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          {label}
        </span>
      </div>
      <div style={{
        fontFamily: mono ? C.mono : C.font,
        fontSize: 18,
        fontWeight: 500,
        color: value ? '#fff' : 'rgba(255,255,255,0.15)',
      }}>
        {value || 'Not provided'}
      </div>
    </div>
  );
}

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLead() {
      try {
        const res = await fetch(`${BACKEND_URL}/leads/${id}`);
        if (!res.ok) throw new Error(`Lead not found (${res.status})`);
        const data = await res.json();
        setLead(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchLead();
  }, [id]);

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', color: C.cyan }}>
        <div style={{ fontFamily: C.font, fontSize: 14, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
          Decrypting Lead Data...
        </div>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#000', gap: 24 }}>
        <div style={{ color: '#ff4444', fontFamily: C.font }}>{error || 'Lead not found'}</div>
        <button onClick={() => router.push('/leads')} style={{
          padding: '12px 24px', background: 'transparent', border: `1px solid ${C.border}`, color: '#fff', cursor: 'pointer', fontFamily: C.font, fontSize: 12
        }}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const priorityCfg = PRIORITY_CONFIG[lead.priority] || PRIORITY_CONFIG.low;

  return (
    <main style={{ minHeight: '100vh', background: '#000', color: '#fff', padding: '40px 24px 100px' }}>
      <style>{`
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        .scanline {
          position: fixed; top: 0; left: 0; width: 100%; height: 100px;
          background: linear-gradient(to bottom, transparent, rgba(0,245,255,0.03), transparent);
          pointer-events: none; z-index: 100;
          animation: scanline 8s linear infinite;
        }
      `}</style>
      <div className="scanline" />

      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 48 }}>
          <button 
            onClick={() => router.push('/leads')}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.40)',
              cursor: 'pointer', fontFamily: C.font, fontSize: 12, padding: 0
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
            BACK TO INTELLIGENCE
          </button>
          <div style={{ fontFamily: C.mono, fontSize: 11, color: 'rgba(255,255,255,0.20)' }}>
            LEAD_ID: {id}
          </div>
        </div>

        {/* Hero Section */}
        <div style={{
          background: C.surfaceLow,
          border: `1px solid ${C.border}`,
          borderRadius: 20,
          padding: '48px',
          marginBottom: 32,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 0 60px rgba(0,0,0,0.5)'
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: priorityCfg.color }} />
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{
                  padding: '4px 12px', borderRadius: 4, background: `${priorityCfg.color}15`,
                  color: priorityCfg.color, border: `1px solid ${priorityCfg.color}`,
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', fontFamily: C.font
                }}>
                  {priorityCfg.label} PRIORITY
                </span>
                <span style={{ color: 'rgba(255,255,255,0.30)', fontSize: 12, fontFamily: C.font }}>
                  Captured on {new Date(lead.captured_at).toLocaleDateString()}
                </span>
             </div>
             <h1 style={{ fontSize: 48, fontWeight: 600, fontFamily: C.font, margin: 0, letterSpacing: '-0.02em' }}>
               {lead.name}
             </h1>
             <div style={{ fontSize: 20, color: C.cyanDim, fontFamily: C.font }}>
               {lead.company}
             </div>
          </div>

          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)', letterSpacing: '0.2em', fontWeight: 600 }}>LEAD SCORE</div>
            <div style={{ 
              fontSize: 72, fontWeight: 700, fontFamily: C.mono, color: priorityCfg.color, 
              lineHeight: 1, textShadow: priorityCfg.glow 
            }}>
              {lead.lead_score}
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 24
        }}>
          <DetailItem label="Primary Interest" value={lead.service} icon="settings_suggest" />
          <DetailItem label="Budget Range" value={lead.budget} icon="payments" mono />
          <DetailItem label="Project Timeline" value={lead.timeline} icon="calendar_today" />
          <DetailItem label="Contact Method" value={lead.contact} icon="alternate_email" mono />
        </div>

        {/* Footer info */}
        <div style={{ marginTop: 64, textAlign: 'center', borderTop: `1px solid ${C.border}`, paddingTop: 32 }}>
          <p style={{ fontFamily: C.font, fontSize: 12, color: 'rgba(255,255,255,0.20)', letterSpacing: '0.05em' }}>
            This profile is read-only. Data is synced in real-time from Supabase Lead Engine.
          </p>
        </div>
      </div>
    </main>
  );
}
