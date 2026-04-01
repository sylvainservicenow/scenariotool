'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

const SvgFolder = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>;
const SvgDatabase = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>;
const SvgPlay = () => <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>;
const SvgPrint = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>;
const SvgPalette = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r="2" fill="currentColor" stroke="none"/><circle cx="17.5" cy="10.5" r="2" fill="currentColor" stroke="none"/><circle cx="8.5" cy="7.5" r="2" fill="currentColor" stroke="none"/><circle cx="6.5" cy="12" r="2" fill="currentColor" stroke="none"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>;
const SvgSave = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>;
const SvgUsers = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;

export default function Header({
  scenario, isSample, canEdit, saveStatus, presenting,
  onPresent, onExitPresent, onPrint, onOpenTheme, onOpenData, onOpenFiles,
  onTitleChange, onSaveAsNew,
  scenarioTeamId, userTeams, onAssignTeam
}) {
  const { user, signOut } = useAuth();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [teamMenuOpen, setTeamMenuOpen] = useState(false);
  const titleRef = useRef(null);
  const dropdownRef = useRef(null);
  const teamMenuRef = useRef(null);
  const router = useRouter();

  useEffect(() => { if (editingTitle && titleRef.current) titleRef.current.focus(); }, [editingTitle]);
  useEffect(() => {
    const h = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
      if (teamMenuRef.current && !teamMenuRef.current.contains(e.target)) setTeamMenuOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleTitleClick = () => { if (!canEdit) return; setTitleDraft(scenario.title || ''); setEditingTitle(true); };
  const handleTitleBlur = () => { setEditingTitle(false); if (titleDraft.trim() && titleDraft !== scenario.title) onTitleChange(titleDraft.trim()); };

  const handleSignOut = async () => {
    setDropdownOpen(false);
    await signOut();
    router.push('/');
  };

  const getInitials = () => {
    if (!user) return '?';
    const name = user.user_metadata?.display_name || user.email || '';
    if (name.includes(' ')) { const p = name.split(' '); return (p[0][0] + p[p.length-1][0]).toUpperCase(); }
    return name.slice(0, 2).toUpperCase();
  };

  const saveLabels = { saved: 'Saved', saving: 'Saving...', error: 'Save failed', unsaved: 'Unsaved' };
  const currentTeamName = userTeams?.find(t => t.id === scenarioTeamId)?.name;

  return (
    <div className={'header-bar no-print' + (presenting ? ' compact' : '')}>
      <div className="header-inner">
        <div className="header-left">
          <div className="header-info">
            {scenario.label && <div className="header-label">{scenario.label}</div>}
            {editingTitle ? (
              <input ref={titleRef} className="header-title-input" value={titleDraft}
                onChange={e => setTitleDraft(e.target.value)} onBlur={handleTitleBlur}
                onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') setEditingTitle(false); }} />
            ) : (
              <div className="header-title" onClick={handleTitleClick} style={canEdit ? { cursor: 'text' } : undefined}>{scenario.title}</div>
            )}
            {!presenting && scenario.subtitle && <div className="header-subtitle">{scenario.subtitle}</div>}
          </div>
        </div>

        {!presenting && scenario.statusLabels && (
          <div className="header-center">
            <div className="status-legend">
              {Object.entries(scenario.statusLabels).map(([key, sl]) => (
                <div key={key} className="status-legend-item"><span className="status-dot" style={{ background: sl.color }}/><span>{sl.label}</span></div>
              ))}
            </div>
          </div>
        )}

        <div className="header-right">
          {!isSample && canEdit && !presenting && (
            <div className={'save-indicator' + (saveStatus === 'saving' ? ' saving' : '') + (saveStatus === 'error' ? ' error' : '')}>{saveLabels[saveStatus] || ''}</div>
          )}

          {presenting ? (
            <button className="header-btn" onClick={onExitPresent}>✕ Exit</button>
          ) : (
            <>
              {onSaveAsNew && <button className="header-btn accent" onClick={onSaveAsNew}><SvgSave /> <span className="btn-label">Save as mine</span></button>}

              {!isSample && canEdit && user && onAssignTeam && (
                <div style={{ position: 'relative' }} ref={teamMenuRef}>
                  <button className="header-btn" onClick={() => setTeamMenuOpen(!teamMenuOpen)}
                    title={currentTeamName ? 'Team: ' + currentTeamName : 'Assign to team'}
                    style={currentTeamName ? { borderColor: 'rgba(118,97,255,0.4)', color: 'rgba(200,180,255,0.9)' } : undefined}>
                    <SvgUsers /><span className="btn-label">{currentTeamName || 'Team'}</span>
                  </button>
                  {teamMenuOpen && (
                    <div className="user-dropdown" style={{ right: 0, width: 200 }}>
                      <button className="user-dropdown-item" style={!scenarioTeamId ? { fontWeight: 600 } : undefined}
                        onClick={() => { onAssignTeam(null); setTeamMenuOpen(false); }}>Personal {!scenarioTeamId && '✓'}</button>
                      {(userTeams || []).map(t => (
                        <button key={t.id} className="user-dropdown-item" style={scenarioTeamId === t.id ? { fontWeight: 600 } : undefined}
                          onClick={() => { onAssignTeam(t.id); setTeamMenuOpen(false); }}>{t.name} {scenarioTeamId === t.id && '✓'}</button>
                      ))}
                      {(!userTeams || !userTeams.length) && <div style={{ padding: '8px 16px', fontSize: 12, color: 'var(--text-muted)' }}>No teams yet</div>}
                    </div>
                  )}
                </div>
              )}

              {user && <button className="header-btn" onClick={onOpenFiles} title="Scenarios"><SvgFolder /></button>}
              <button className="header-btn" onClick={onOpenData} title="Edit data"><SvgDatabase /></button>
              <div className="header-divider" />
              <button className="header-btn" onClick={onPresent}><SvgPlay /> <span className="btn-label">Present</span></button>
              <button className="header-btn" onClick={onPrint}><SvgPrint /> <span className="btn-label">Print</span></button>
              <button className="header-btn" onClick={onOpenTheme} title="Theme"><SvgPalette /></button>
            </>
          )}

          <div className="header-divider" />

          {user ? (
            <div className="user-menu" ref={dropdownRef}>
              <div className="user-avatar" onClick={() => setDropdownOpen(!dropdownOpen)}>{getInitials()}</div>
              {dropdownOpen && (
                <div className="user-dropdown">
                  <div className="user-dropdown-info">{user.user_metadata?.display_name || 'User'}<small>{user.email}</small></div>
                  <button className="user-dropdown-item" onClick={handleSignOut}>Sign out</button>
                </div>
              )}
            </div>
          ) : !presenting && <Link href="/auth/login" className="header-signin">Sign in</Link>}
        </div>
      </div>
    </div>
  );
}
