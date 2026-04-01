'use client';

import { Suspense, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { getSupabase } from '@/lib/supabase-browser';
import sampleScenario from '@/public/scenario_data.json';
import Header from '@/components/Header';
import PhaseSection from '@/components/PhaseSection';
import LeftPanel from '@/components/LeftPanel';
import ScenarioDrawer from '@/components/ScenarioDrawer';

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

function ToolContent() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [scenario, setScenario] = useState(null);
  const [scenarioId, setScenarioId] = useState(null);
  const [scenarioTeamId, setScenarioTeamId] = useState(null);
  const [isSample, setIsSample] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [saveStatus, setSaveStatus] = useState('saved');
  const [userTeams, setUserTeams] = useState([]);

  const [expandedSteps, setExpandedSteps] = useState(new Set());
  const [collapsedPhases, setCollapsedPhases] = useState(new Set());
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelTab, setPanelTab] = useState('editor');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const [presStep, setPresStep] = useState(0);
  const saveTimer = useRef(null);

  const urlId = params?.id?.[0] || null;

  const loadUserTeams = useCallback(async () => {
    if (!user) { setUserTeams([]); return; }
    try {
      const sb = getSupabase();
      const { data: mem } = await sb.from('team_members').select('team_id,role').eq('user_id', user.id);
      const teams = [];
      for (const m of (mem || [])) {
        const { data: t } = await sb.from('teams').select('id,name').eq('id', m.team_id).single();
        if (t) teams.push({ ...t, role: m.role });
      }
      setUserTeams(teams);
    } catch (e) { console.warn('Teams:', e); }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    const load = async () => {
      if (urlId) {
        try {
          const sb = getSupabase();
          const { data, error } = await sb.from('scenarios').select('*').eq('id', urlId).single();
          if (error || !data) { setScenario(sampleScenario); setIsSample(true); setCanEdit(false); setScenarioTeamId(null); return; }
          setScenario({ ...data.data, title: data.title, subtitle: data.subtitle });
          setScenarioId(data.id); setScenarioTeamId(data.team_id); setIsSample(false);
          if (user && data.owner_id === user.id) setCanEdit(true);
          else if (user && data.team_id) {
            const { data: m } = await sb.from('team_members').select('role').eq('team_id', data.team_id).eq('user_id', user.id).single();
            setCanEdit(m && (m.role === 'owner' || m.role === 'editor'));
          } else setCanEdit(false);
        } catch (e) { console.error('Load:', e); setScenario(sampleScenario); setIsSample(true); setCanEdit(false); }
      } else { setScenario(sampleScenario); setIsSample(true); setCanEdit(false); setScenarioId(null); setScenarioTeamId(null); }
    };
    load(); loadUserTeams();
  }, [urlId, user, authLoading, loadUserTeams]);

  useEffect(() => { if (scenario?.theme) applyTheme(scenario.theme); }, [scenario]);

  const saveToDb = useCallback(async (d) => {
    if (!scenarioId || !canEdit) return;
    setSaveStatus('saving');
    const { error } = await getSupabase().from('scenarios').update({ title: d.title || 'Untitled', subtitle: d.subtitle || '', data: d }).eq('id', scenarioId);
    setSaveStatus(error ? 'error' : 'saved');
  }, [scenarioId, canEdit]);

  const handleChange = useCallback((d) => {
    setScenario(d);
    if (scenarioId && canEdit) { setSaveStatus('unsaved'); if (saveTimer.current) clearTimeout(saveTimer.current); saveTimer.current = setTimeout(() => saveToDb(d), 2000); }
  }, [scenarioId, canEdit, saveToDb]);

  const handleAssignTeam = useCallback(async (tid) => {
    if (!scenarioId || !canEdit) return;
    const { error } = await getSupabase().from('scenarios').update({ team_id: tid }).eq('id', scenarioId);
    if (error) { alert('Failed: ' + error.message); return; }
    setScenarioTeamId(tid);
  }, [scenarioId, canEdit]);

  const handleSaveAsNew = useCallback(async () => {
    if (!user || !scenario) return;
    const { data, error } = await getSupabase().from('scenarios').insert({ title: scenario.title, subtitle: scenario.subtitle || '', data: scenario, owner_id: user.id }).select().single();
    if (error) { alert('Save failed: ' + error.message); return; }
    if (data) router.push('/tool/' + data.id);
  }, [user, scenario, router]);

  const handleDelete = useCallback(async (id) => {
    await getSupabase().from('scenarios').delete().eq('id', id);
    if (id === scenarioId) router.push('/tool');
  }, [scenarioId, router]);

  const handleNew = useCallback(async () => {
    if (!user) { router.push('/auth/login?redirect=/tool'); return; }
    const blank = { title: 'New Scenario', subtitle: '', label: 'POC Scenario', notes: '', statusLabels: { live:{label:'Live',color:'#81B532'}, mixed:{label:'Live + Mock',color:'#CF4A00'}, 'poc-new':{label:'POC New',color:'#52B8FF'}, 'agent-logic':{label:'Agent Logic',color:'#7661FF'} }, phases: [] };
    const { data, error } = await getSupabase().from('scenarios').insert({ title: blank.title, subtitle: '', data: blank, owner_id: user.id }).select().single();
    if (error) { alert('Create failed: ' + error.message); return; }
    if (data) { setDrawerOpen(false); router.push('/tool/' + data.id); }
  }, [user, router]);

  const stepIds = useMemo(() => scenario ? collectStepIds(scenario.phases || []) : [], [scenario]);
  const total = stepIds.length;

  useEffect(() => {
    if (!presenting) return;
    const h = (e) => {
      if (e.key === 'Escape') { setPresenting(false); return; }
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); setPresStep(p => { const n = Math.min(p+1,total-1); setExpandedSteps(s => { const ns=new Set(s); ns.add(stepIds[n]); return ns; }); setTimeout(()=>document.querySelector('[data-step-id="'+stepIds[n]+'"]')?.scrollIntoView({behavior:'smooth',block:'center'}),50); return n; }); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); setPresStep(p => { setExpandedSteps(s => { const ns=new Set(s); ns.delete(stepIds[p]); return ns; }); const n=Math.max(p-1,0); setTimeout(()=>document.querySelector('[data-step-id="'+stepIds[n]+'"]')?.scrollIntoView({behavior:'smooth',block:'center'}),50); return n; }); }
    };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, [presenting, stepIds, total]);

  const toggleStep = useCallback((id) => { if (presenting) return; setExpandedSteps(p => { const n=new Set(p); n.has(id)?n.delete(id):n.add(id); return n; }); }, [presenting]);
  const togglePhase = useCallback((name) => { setCollapsedPhases(p => { const n=new Set(p); n.has(name)?n.delete(name):n.add(name); return n; }); }, []);

  if (!scenario) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',color:'var(--text-muted)',fontSize:15}}>Loading scenario...</div>;

  return (
    <div>
      {!panelOpen && !presenting && <div className="editor-tab no-print" onClick={()=>{setPanelTab('editor');setPanelOpen(true);}}>DATA</div>}

      <Header scenario={scenario} isSample={isSample} canEdit={canEdit} saveStatus={saveStatus}
        presenting={presenting} onPresent={()=>{setExpandedSteps(new Set());setCollapsedPhases(new Set());setPresStep(0);setPresenting(true);setPanelOpen(false);setDrawerOpen(false);}}
        onExitPresent={()=>setPresenting(false)} onPrint={()=>{setExpandedSteps(new Set(stepIds));setCollapsedPhases(new Set());setTimeout(()=>window.print(),200);}}
        onOpenTheme={()=>{setPanelTab('theme');setPanelOpen(true);}} onOpenData={()=>{setPanelTab('editor');setPanelOpen(true);}} onOpenFiles={()=>setDrawerOpen(true)}
        onTitleChange={t=>handleChange({...scenario,title:t})} onSaveAsNew={user&&isSample?handleSaveAsNew:null}
        scenarioTeamId={scenarioTeamId} userTeams={userTeams} onAssignTeam={!isSample&&canEdit?handleAssignTeam:null} />

      <div className="main-content">
        {(scenario.phases||[]).map((phase,pi)=><PhaseSection key={pi} phase={phase} statusLabels={scenario.statusLabels||{}} expandedSteps={expandedSteps} toggleStep={toggleStep} activeStepId={presenting?stepIds[presStep]:null} collapsed={collapsedPhases.has(phase.phase)} onToggleCollapse={()=>togglePhase(phase.phase)}/>)}
        {scenario.notes&&<div className="notes-footer"><div className="notes-label">Notes</div>{scenario.notes}</div>}
        {!(scenario.phases||[]).length&&<div style={{textAlign:'center',padding:'80px 20px',color:'var(--text-muted)'}}><div style={{fontSize:40,marginBottom:16}}>📋</div><div style={{fontSize:18,fontWeight:600,marginBottom:8,color:'var(--text-secondary)'}}>Empty scenario</div><div style={{fontSize:14}}>Click DATA on the left to open the editor.</div></div>}
      </div>

      {presenting&&<div className="presentation-counter">Step {presStep+1} of {total}</div>}

      <LeftPanel open={panelOpen} onClose={()=>setPanelOpen(false)} data={scenario} onApply={handleChange} activeTab={panelTab} setActiveTab={setPanelTab}/>
      <ScenarioDrawer open={drawerOpen} onClose={()=>{setDrawerOpen(false);loadUserTeams();}} currentId={scenarioId} onSelect={id=>{setDrawerOpen(false);router.push('/tool/'+id);}} onNew={handleNew} onDelete={handleDelete}/>
    </div>
  );
}

export default function ToolPage() {
  return <Suspense fallback={<div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',color:'var(--text-muted)'}}>Loading...</div>}><ToolContent/></Suspense>;
}
