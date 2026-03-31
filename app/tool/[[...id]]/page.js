'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { getSupabase } from '@/lib/supabase-browser';
import sampleScenario from '@/public/scenario_data.json';
import Header from '@/components/Header';
import PhaseSection from '@/components/PhaseSection';
import LeftPanel from '@/components/LeftPanel';
import ScenarioDrawer from '@/components/ScenarioDrawer';

function collectStepIds(phases) {
  const ids = [];
  function walk(steps) {
    if (!steps) return;
    steps.forEach(s => {
      ids.push(String(s.id));
      if (s.branches) s.branches.forEach(b => walk(b.steps));
    });
  }
  phases.forEach(p => walk(p.steps));
  return ids;
}

export default function ToolPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Scenario state
  const [scenario, setScenario] = useState(null);
  const [scenarioId, setScenarioId] = useState(null);
  const [isSample, setIsSample] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [saveStatus, setSaveStatus] = useState('saved'); // saved | saving | error | unsaved

  // UI state
  const [expandedSteps, setExpandedSteps] = useState(new Set());
  const [collapsedPhases, setCollapsedPhases] = useState(new Set());
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelTab, setPanelTab] = useState('editor');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const [presStep, setPresStep] = useState(0);

  // Auto-save ref
  const saveTimerRef = useRef(null);

  // Determine scenario ID from URL params
  const urlId = params?.id?.[0] || null;

  // Load scenario
  useEffect(() => {
    if (authLoading) return;

    const loadScenario = async () => {
      if (urlId) {
        // Load from Supabase
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from('scenarios')
          .select('*')
          .eq('id', urlId)
          .single();

        if (error || !data) {
          // Fallback to sample
          setScenario(sampleScenario);
          setIsSample(true);
          setCanEdit(false);
          return;
        }

        const fullData = { ...data.data, title: data.title, subtitle: data.subtitle };
        setScenario(fullData);
        setScenarioId(data.id);
        setIsSample(false);

        // Check edit permission
        if (user && data.owner_id === user.id) {
          setCanEdit(true);
        } else if (user && data.team_id) {
          const { data: membership } = await supabase
            .from('team_members')
            .select('role')
            .eq('team_id', data.team_id)
            .eq('user_id', user.id)
            .single();
          setCanEdit(membership && (membership.role === 'owner' || membership.role === 'editor'));
        } else {
          setCanEdit(false);
        }
      } else {
        // No ID - show sample
        setScenario(sampleScenario);
        setIsSample(true);
        setCanEdit(false);
      }
    };

    loadScenario();
  }, [urlId, user, authLoading]);

  // Auto-save to Supabase (debounced)
  const saveToSupabase = useCallback(async (data) => {
    if (!scenarioId || !canEdit) return;
    setSaveStatus('saving');
    const supabase = getSupabase();
    const { error } = await supabase
      .from('scenarios')
      .update({
        title: data.title || 'Untitled',
        subtitle: data.subtitle || '',
        data: data,
      })
      .eq('id', scenarioId);

    setSaveStatus(error ? 'error' : 'saved');
  }, [scenarioId, canEdit]);

  const handleScenarioChange = useCallback((newData) => {
    setScenario(newData);
    if (scenarioId && canEdit) {
      setSaveStatus('unsaved');
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => saveToSupabase(newData), 2000);
    }
  }, [scenarioId, canEdit, saveToSupabase]);

  // Presentation mode
  const stepIds = useMemo(() => scenario ? collectStepIds(scenario.phases || []) : [], [scenario]);
  const totalSteps = stepIds.length;

  useEffect(() => {
    if (!presenting) return;
    const handler = (e) => {
      if (e.key === 'Escape') { setPresenting(false); return; }
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        setPresStep(prev => {
          const next = Math.min(prev + 1, totalSteps - 1);
          setExpandedSteps(s => { const ns = new Set(s); ns.add(stepIds[next]); return ns; });
          setTimeout(() => {
            const el = document.querySelector('[data-step-id="' + stepIds[next] + '"]');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 50);
          return next;
        });
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setPresStep(prev => {
          setExpandedSteps(s => { const ns = new Set(s); ns.delete(stepIds[prev]); return ns; });
          const next = Math.max(prev - 1, 0);
          setTimeout(() => {
            const el = document.querySelector('[data-step-id="' + stepIds[next] + '"]');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 50);
          return next;
        });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [presenting, stepIds, totalSteps]);

  const toggleStep = useCallback((id) => {
    if (presenting) return;
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, [presenting]);

  const togglePhase = useCallback((phaseName) => {
    setCollapsedPhases(prev => {
      const next = new Set(prev);
      if (next.has(phaseName)) next.delete(phaseName); else next.add(phaseName);
      return next;
    });
  }, []);

  const startPresentation = () => {
    setExpandedSteps(new Set());
    setCollapsedPhases(new Set());
    setPresStep(0);
    setPresenting(true);
    setPanelOpen(false);
    setDrawerOpen(false);
  };

  const handlePrint = () => {
    setExpandedSteps(new Set(stepIds));
    setCollapsedPhases(new Set());
    setTimeout(() => window.print(), 200);
  };

  const handleTitleChange = (newTitle) => {
    if (!canEdit || !scenario) return;
    handleScenarioChange({ ...scenario, title: newTitle });
  };

  const handleLoadScenario = (id) => {
    setDrawerOpen(false);
    router.push('/tool/' + id);
  };

  const handleNewScenario = async () => {
    if (!user) { router.push('/auth/login?redirect=/tool'); return; }
    const supabase = getSupabase();
    const blank = {
      title: 'New Scenario',
      subtitle: '',
      label: 'POC Scenario',
      notes: '',
      statusLabels: {
        live: { label: 'Live', color: '#81B532' },
        mixed: { label: 'Live + Mock', color: '#CF4A00' },
        'poc-new': { label: 'POC New', color: '#52B8FF' },
        'agent-logic': { label: 'Agent Logic', color: '#7661FF' }
      },
      phases: []
    };
    const { data, error } = await supabase
      .from('scenarios')
      .insert({ title: blank.title, subtitle: '', data: blank, owner_id: user.id })
      .select()
      .single();

    if (!error && data) {
      setDrawerOpen(false);
      router.push('/tool/' + data.id);
    }
  };

  if (!scenario) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: 'var(--text-muted)' }}>
        Loading...
      </div>
    );
  }

  const activeStepId = presenting ? stepIds[presStep] : null;

  return (
    <div>
      {/* Left edge tabs */}
      {!panelOpen && !drawerOpen && !presenting && (
        <div className="no-print" style={{ position: 'fixed', left: 0, top: '50%', transform: 'translateY(-50%)', zIndex: 199, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {user && (
            <div className="editor-tab" style={{ borderRadius: '0 8px 0 0', paddingBottom: 10 }}
              onClick={() => setDrawerOpen(true)}>
              FILES
            </div>
          )}
          <div className="editor-tab" style={{ borderRadius: user ? '0 0 8px 0' : '0 8px 8px 0' }}
            onClick={() => { setPanelTab('editor'); setPanelOpen(true); }}>
            DATA
          </div>
        </div>
      )}

      <Header
        scenario={scenario}
        isSample={isSample}
        canEdit={canEdit}
        saveStatus={saveStatus}
        presenting={presenting}
        onPresent={startPresentation}
        onExitPresent={() => setPresenting(false)}
        onPrint={handlePrint}
        onOpenTheme={() => { setPanelTab('theme'); setPanelOpen(true); }}
        onTitleChange={handleTitleChange}
        user={user}
      />

      <div className="main-content">
        {(scenario.phases || []).map((phase, pi) => (
          <PhaseSection
            key={pi}
            phase={phase}
            statusLabels={scenario.statusLabels || {}}
            expandedSteps={expandedSteps}
            toggleStep={toggleStep}
            activeStepId={activeStepId}
            collapsed={collapsedPhases.has(phase.phase)}
            onToggleCollapse={() => togglePhase(phase.phase)}
          />
        ))}

        {scenario.notes && (
          <div className="notes-footer">
            <div className="notes-label">Notes</div>
            {scenario.notes}
          </div>
        )}
      </div>

      {presenting && (
        <div className="presentation-counter">
          Step {presStep + 1} of {totalSteps}
        </div>
      )}

      <LeftPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        data={scenario}
        canEdit={canEdit}
        onApply={handleScenarioChange}
        activeTab={panelTab}
        setActiveTab={setPanelTab}
      />

      <ScenarioDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        currentId={scenarioId}
        onSelect={handleLoadScenario}
        onNew={handleNewScenario}
      />
    </div>
  );
}
