'use client';

import React, { useEffect, useState, useCallback } from 'react';
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

/* ── Sub-components ─────────────────────────────────────────────────── */

function ScoreBadge({ score }: { score: number }) {
  const pct   = Math.min(100, Math.max(0, score));
  const color = pct >= 75 ? C.cyan : pct >= 50 ? C.gold : '#849495';
  const circumference = 2 * Math.PI * 14;
  const dash  = (pct / 100) * circumference;
  return (
    <div style={{ position: 'relative', width: 40, height: 40, flexShrink: 0 }}>
      <svg width={40} height={40} viewBox="0 0 40 40" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={20} cy={20} r={14} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={2.5} />
        <circle cx={20} cy={20} r={14} fill="none" stroke={color} strokeWidth={2.5}
          strokeDasharray={`${dash} ${circumference}`} strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 4px ${color})`, transition: 'stroke-dasharray 0.8s ease' }}
        />
      </svg>
      <span style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: C.mono, fontSize: '10px', fontWeight: 700, color,
      }}>
        {score}
      </span>
    </div>
  );
}

function PriorityPip({ priority }: { priority: string }) {
  const cfg = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.low;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '3px 10px', borderRadius: 4,
      border: `1px solid ${cfg.color}`, background: `${cfg.color}12`,
      color: cfg.color, fontFamily: C.font, fontSize: 10, fontWeight: 700,
      letterSpacing: '0.12em', textTransform: 'uppercase', boxShadow: cfg.glow,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
      {cfg.label}
    </span>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{
      flex: 1, minWidth: 140, padding: '20px 24px',
      background: C.surfaceLow, border: `1px solid ${C.border}`,
      borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <span style={{ fontFamily: C.font, fontSize: 11, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>
        {label}
      </span>
      <span style={{ fontFamily: C.font, fontSize: 28, fontWeight: 600, color: C.cyan, textShadow: C.cyanGlow, lineHeight: 1 }}>
        {value}
      </span>
      {sub && <span style={{ fontFamily: C.font, fontSize: 11, color: 'rgba(255,255,255,0.30)' }}>{sub}</span>}
    </div>
  );
}

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} style={{ padding: '16px 20px', borderBottom: `1px solid ${C.borderDim}` }}>
          <div style={{
            height: 12, borderRadius: 4,
            background: 'linear-gradient(90deg, #1a2424 25%, #243030 50%, #1a2424 75%)',
            backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite',
            width: `${40 + (i * 13) % 50}%`,
          }} />
        </td>
      ))}
    </tr>
  );
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return (
      d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ' · ' +
      d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
    );
  } catch { return iso; }
}

/* ── Page ───────────────────────────────────────────────────────────── */

const COLS = ['Score', 'Priority', 'Name', 'Company', 'Service', 'Budget', 'Timeline', 'Contact', 'Captured'];

export default function LeadsPage() {
  const [leads,       setLeads]       = useState<Lead[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<string>('');
  const [filter,      setFilter]      = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [sortBy,      setSortBy]      = useState<'captured_at' | 'lead_score'>('captured_at');

  const router = useRouter();

  const getRefreshTime = () => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/leads`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Lead[] = await res.json();
      setLeads(data);
      setLastRefresh(getRefreshTime());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const filtered = leads
    .filter(l => filter === 'all' || l.priority === filter)
    .sort((a, b) =>
      sortBy === 'lead_score'
        ? (b.lead_score ?? 0) - (a.lead_score ?? 0)
        : new Date(b.captured_at).getTime() - new Date(a.captured_at).getTime()
    );

  const highCount  = leads.filter(l => l.priority === 'high').length;
  const avgScore   = leads.length
    ? Math.round(leads.reduce((s, l) => s + (l.lead_score ?? 0), 0) / leads.length)
    : 0;
  const topService = (() => {
    const freq: Record<string, number> = {};
    leads.forEach(l => { if (l.service) freq[l.service] = (freq[l.service] ?? 0) + 1; });
    return Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
  })();

  return (
    <>
      <style>{`
        html, body { overflow: auto !important; height: auto !important; }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .lead-row { animation: fadeSlideIn 0.3s ease both; cursor: pointer; }
        .lead-row:hover td { background: rgba(0,245,255,0.04) !important; }
        .filter-btn { transition: all 180ms ease; }
        .filter-btn:hover { border-color: ${C.cyan} !important; color: ${C.cyan} !important; }
        .topbar-btn { transition: color 200ms ease; }
        .topbar-btn:hover { color: ${C.cyan} !important; }
      `}</style>

      {/* ── Top Bar ─────────────────────────────────────────────────── */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        height: 72, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 32px',
        background: 'rgba(0,0,0,0.80)',
        backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
        borderBottom: `1px solid ${C.border}`,
        boxShadow: '0 0 30px rgba(0,245,255,0.05)',
      }}>
        {/* Brand + breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span style={{ fontFamily: C.font, fontSize: 18, fontWeight: 300, letterSpacing: '0.2em', color: '#fff' }}>Eera</span>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: '#849495', letterSpacing: '0.05em' }}>by Zenx</span>
          </div>
          <span style={{ width: 1, height: 18, background: C.border }} />
          <span style={{ fontFamily: C.font, fontSize: 11, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.cyanDim }}>
            Lead Intelligence
          </span>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.03em' }}>
            {lastRefresh ? `Updated ${lastRefresh}` : 'Loading...'}
          </span>

          <button
            className="topbar-btn"
            onClick={fetchLeads}
            disabled={loading}
            title="Refresh"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 6,
              border: `1px solid ${C.border}`, background: 'transparent',
              color: 'rgba(255,255,255,0.38)', fontFamily: C.font,
              fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
              cursor: loading ? 'wait' : 'pointer',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>refresh</span>
            Refresh
          </button>
        </div>
      </header>

      {/* ── Body ─────────────────────────────────────────────────────── */}
      <main style={{
        paddingTop: 72,
        minHeight: '100vh',
        background: '#000000',
        overflowY: 'auto',
      }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '40px 32px 80px' }}>

          {/* Heading */}
          <div style={{ marginBottom: 36 }}>
            <h1 style={{
              fontFamily: C.font, fontSize: 32, fontWeight: 600,
              letterSpacing: '-0.01em', color: '#fff', lineHeight: 1, marginBottom: 8,
            }}>
              Lead Dashboard
            </h1>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
              Read-only · synced from Supabase{' '}
              <code style={{ fontFamily: C.mono, fontSize: 11, color: C.cyanDim, background: C.cyanFaint, padding: '1px 6px', borderRadius: 4 }}>
                leads
              </code>
            </p>
          </div>

          {/* Stats */}
          {!loading && !error && leads.length > 0 && (
            <div style={{ display: 'flex', gap: 16, marginBottom: 32, flexWrap: 'wrap' }}>
              <StatCard label="Total Leads"   value={leads.length}  sub="all captured" />
              <StatCard label="High Priority" value={highCount}     sub={`${Math.round(highCount / leads.length * 100)}% of total`} />
              <StatCard label="Avg Score"     value={avgScore}      sub="across all leads" />
              <StatCard label="Top Service"   value={topService}    sub="most requested" />
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              padding: '16px 24px', marginBottom: 24,
              background: 'rgba(127,29,29,0.30)', border: '1px solid #7f1d1d',
              borderRadius: 8, color: '#fca5a5',
              fontFamily: "'Inter', sans-serif", fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>error</span>
              {error} — backend may be offline.
            </div>
          )}

          {/* Filter + Sort */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 16, gap: 12, flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['all', 'high', 'medium', 'low'] as const).map(p => {
                const active = filter === p;
                const cfg    = p === 'all' ? null : PRIORITY_CONFIG[p];
                const ac     = cfg?.color ?? C.cyan;
                return (
                  <button key={p} className="filter-btn" onClick={() => setFilter(p)} style={{
                    padding: '6px 14px', borderRadius: 6,
                    border:     `1px solid ${active ? ac : C.border}`,
                    background: active ? `${ac}15` : 'transparent',
                    color:      active ? ac : 'rgba(255,255,255,0.38)',
                    fontFamily: C.font, fontSize: 11, fontWeight: 600,
                    letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
                    boxShadow: active ? `0 0 14px ${ac}35` : 'none',
                  }}>
                    {p === 'all'
                      ? `All (${leads.length})`
                      : `${p} (${leads.filter(l => l.priority === p).length})`}
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.26)' }}>Sort</span>
              {(['captured_at', 'lead_score'] as const).map(s => (
                <button key={s} className="filter-btn" onClick={() => setSortBy(s)} style={{
                  padding: '6px 12px', borderRadius: 6,
                  border:     `1px solid ${sortBy === s ? C.cyan : C.border}`,
                  background: sortBy === s ? C.cyanFaint : 'transparent',
                  color:      sortBy === s ? C.cyan : 'rgba(255,255,255,0.32)',
                  fontFamily: C.font, fontSize: 10, fontWeight: 600,
                  letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
                }}>
                  {s === 'captured_at' ? 'Latest' : 'Score'}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div style={{
            background: C.surfaceLow, border: `1px solid ${C.border}`,
            borderRadius: 10, overflow: 'hidden',
            boxShadow: '0 0 60px rgba(0,0,0,0.70)',
          }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    {COLS.map(col => (
                      <th key={col} style={{
                        padding: '14px 20px', textAlign: 'left',
                        fontFamily: C.font, fontSize: 10, fontWeight: 700,
                        letterSpacing: '0.14em', textTransform: 'uppercase',
                        color: 'rgba(255,255,255,0.26)', background: 'rgba(0,0,0,0.30)',
                        whiteSpace: 'nowrap',
                      }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading && Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={COLS.length} />)}

                  {!loading && filtered.length === 0 && (
                    <tr>
                      <td colSpan={COLS.length} style={{
                        padding: '64px 24px', textAlign: 'center',
                        fontFamily: C.font, fontSize: 13, color: 'rgba(255,255,255,0.22)',
                        letterSpacing: '0.05em',
                      }}>
                        {error ? 'Could not load leads.' : 'No leads match this filter.'}
                      </td>
                    </tr>
                  )}

                  {!loading && filtered.map((lead, idx) => (
                    <tr key={lead.id ?? idx} className="lead-row"
                      onClick={() => router.push(`/leads/${lead.id}`)}
                      style={{ animationDelay: `${idx * 35}ms`, borderBottom: `1px solid ${C.borderDim}` }}
                    >
                      <td style={{ padding: '14px 20px' }}>
                        <ScoreBadge score={lead.lead_score ?? 0} />
                      </td>
                      <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                        <PriorityPip priority={lead.priority} />
                      </td>
                      <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontFamily: C.font, fontSize: 13, fontWeight: 600, color: '#fff' }}>
                          {lead.name || '—'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontFamily: C.font, fontSize: 13, color: C.cyanDim }}>
                          {lead.company || '—'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{
                          fontFamily: "'Inter', sans-serif", fontSize: 12,
                          color: 'rgba(255,255,255,0.60)', background: 'rgba(255,255,255,0.05)',
                          padding: '3px 10px', borderRadius: 4, whiteSpace: 'nowrap',
                        }}>
                          {lead.service || '—'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontFamily: C.mono, fontSize: 12, color: C.gold }}>
                          {lead.budget || '—'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.48)' }}>
                          {lead.timeline || '—'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{
                          fontFamily: C.mono, fontSize: 11,
                          color: 'rgba(255,255,255,0.40)', wordBreak: 'break-all',
                        }}>
                          {lead.contact || '—'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.26)' }}>
                          {lead.captured_at ? formatDate(lead.captured_at) : '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!loading && filtered.length > 0 && (
              <div style={{
                padding: '12px 20px', borderTop: `1px solid ${C.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'rgba(0,0,0,0.20)',
              }}>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.20)' }}>
                  Showing {filtered.length} of {leads.length} lead{leads.length !== 1 ? 's' : ''}
                </span>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.16)' }}>
                  Read-only · no edit access
                </span>
              </div>
            )}
          </div>

        </div>
      </main>
    </>
  );
}
