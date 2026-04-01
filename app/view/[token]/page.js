'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { getSupabase } from '@/lib/supabase-browser';
import PhaseSection from '@/components/PhaseSection';
import ToolPill from '@/components/ToolPill';
import Link from 'next/link';

const THEME_MAP = {
  headerBg1:'--infinite-blue',headerBg2:'--mid-teal',headerAccent:'--wasabi',
  toolPillBg:'--tool-pill-bg',toolPillColor:'--tool-pill-color',toolPillBorder:'--tool-pill-border',
  tooltipBg:'--tooltip-bg',tooltipAccent:'--tooltip-accent',
  pageBg:'--page-bg',cardBg:'--surface-1',cardBorder:'--border-subtle',
  textPrimary:'--text-primary',textSecondary:'--text-secondary',textMuted:'--text-muted'
};

function applyTheme(theme) {
  if (typeof document === 'undefined' || !theme) return;
  const r = document.documentElement;
  Object.entries(THEME_MAP).forEach(([k, v]) => { if (theme[k]) r.style.setProperty(v, theme[k]); });
}

function collectStepIds(phases) {
  const ids = [];
  const walk = (steps) => { if (!steps) return; steps.forEach(s => { ids.push(String(s.id)); if (s.branches) s.branches.forEach(b => walk(b.steps)); }); };
  phases.forEach(p => walk(p.steps)); return ids;
}

export default function PublicViewPage() {
  const params = useParams();
  const token = params.token;
  const { user } = useAuth();

  const [scenario, setScenario] = useState(null);
  const [scenarioId, setScenarioId] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState(new Set());
  const [collapsedPhases, setCollapsedPhases] = useState(new Set());
  const [presenting, setPresenting] = useState(false);
  const [presStep, setPresStep] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const sb = getSupabase();
      const { data, error } = await sb
        .from('scenarios')
        .select('*')
        .eq('public_token', token)
        .eq('is_public', true)
        .single();

      if (error || !data) {
        setNotFound(true);
        return;
      }

      setScenario({ ...data.data, title: data.title, subtitle: data.subtitle });
      setScenarioId(data.id);
    };
    if (token) load();
  }, [token]);

  useEffect(() => { if (scenario?.theme) applyTheme(scenario.theme); }, [scenario]);

  const stepIds = useMemo(() => scenario ? collectStepIds(scenario.phases || []) : [], [scenario]);
  const total = stepIds.length;

  // Presentation keyboard
  useEffect(() => {
    if (!presenting) return;
    const h = (e) => {
      if (e.key === 'Escape') { setPresenting(false); return; }
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        setPresStep(p => {
          const n = Math.min(p + 1, total - 1);
          setExpandedSteps(s => { const ns = new Set(s); ns.add(stepIds[n]); return ns; });
          setTimeout(() => document.querySelector('[data-step-id="' + stepIds[n] + '"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
          return n;
        });
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setPresStep(p => {
          setExpandedSteps(s => { const ns = new Set(s); ns.delete(stepIds[p]); return ns; });
          const n = Math.max(p - 1, 0);
          setTimeout(() => document.querySelector('[data-step-id="' + stepIds[n] + '"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
          return n;
        });
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [presenting, stepIds, total]);

  const toggleStep = useCallback((id) => {
    if (presenting) return;
    setExpandedSteps(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }, [presenting]);

  const togglePhase = useCallback((name) => {
    setCollapsedPhases(p => { const n = new Set(p); n.has(name) ? n.delete(name) : n.add(name); return n; });
  }, []);

  const handleSaveAsNew = async () => {
    if (!user || !scenario) return;
    setSaving(true);
    try {
      const { data, error } = await getSupabase().from('scenarios')
        .insert({ title: scenario.title, subtitle: scenario.subtitle || '', data: scenario, owner_id: user.id })
        .select().single();
      if (error) { alert('Save failed: ' + error.message); setSaving(false); return; }
      if (data) window.location.href = '/tool/' + data.id;
    } catch (e) { alert('Error: ' + e.message); setSaving(false); }
  };

  if (notFound) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <h1>Not found</h1>
          <p>This scenario doesn&apos;t exist or is no longer public.</p>
          <Link href="/" className="auth-submit" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', marginTop: 16 }}>Go home</Link>
        </div>
      </div>
    );
  }

  if (!scenario) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: 'var(--text-muted)', fontSize: 15 }}>Loading...</div>;
  }

  const activeStepId = presenting ? stepIds[presStep] : null;

  return (
    <div>
      {/* Minimal header */}
      <div className={'header-bar no-print' + (presenting ? ' compact' : '')}>
        <div className="header-inner">
          <div className="header-left">
            <div className="header-info">
              {scenario.label && <div className="header-label">{scenario.label}</div>}
              <div className="header-title">{scenario.title}</div>
              {!presenting && scenario.subtitle && <div className="header-subtitle">{scenario.subtitle}</div>}
            </div>
          </div>

          {!presenting && scenario.statusLabels && (
            <div className="header-center">
              <div className="status-legend">
                {Object.entries(scenario.statusLabels).map(([key, sl]) => (
                  <div key={key} className="status-legend-item">
                    <span className="status-dot" style={{ background: sl.color }} /><span>{sl.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="header-right">
            {presenting ? (
              <button className="header-btn" onClick={() => setPresenting(false)}>✕ Exit</button>
            ) : (
              <>
                {user && (
                  <button className="header-btn accent" onClick={handleSaveAsNew} disabled={saving}>
                    {saving ? 'Saving...' : '💾 Save as mine'}
                  </button>
                )}
                <button className="header-btn" onClick={() => {
                  setExpandedSteps(new Set()); setCollapsedPhases(new Set());
                  setPresStep(0); setPresenting(true);
                }}>
                  ▶ <span className="btn-label">Present</span>
                </button>
                <button className="header-btn" onClick={() => {
                  setExpandedSteps(new Set(stepIds)); setCollapsedPhases(new Set());
                  setTimeout(() => window.print(), 200);
                }}>
                  🖶 <span className="btn-label">Print</span>
                </button>
                <div className="header-divider" />
                {user ? (
                  <Link href="/tool" className="header-btn" style={{ textDecoration: 'none' }}>Open Tool</Link>
                ) : (
                  <Link href="/auth/login" className="header-signin">Sign in</Link>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="main-content">
        {(scenario.phases || []).map((phase, pi) => (
          <PhaseSection key={pi} phase={phase} statusLabels={scenario.statusLabels || {}}
            expandedSteps={expandedSteps} toggleStep={toggleStep} activeStepId={activeStepId}
            collapsed={collapsedPhases.has(phase.phase)} onToggleCollapse={() => togglePhase(phase.phase)} />
        ))}
        {scenario.notes && <div className="notes-footer"><div className="notes-label">Notes</div>{scenario.notes}</div>}
      </div>

      {presenting && <div className="presentation-counter">Step {presStep + 1} of {total}</div>}
    </div>
  );
}
