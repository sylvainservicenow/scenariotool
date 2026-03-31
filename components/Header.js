'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase-browser';

function PrintIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function PaletteIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13.5" cy="6.5" r="2" fill="currentColor" stroke="none" />
      <circle cx="17.5" cy="10.5" r="2" fill="currentColor" stroke="none" />
      <circle cx="8.5" cy="7.5" r="2" fill="currentColor" stroke="none" />
      <circle cx="6.5" cy="12" r="2" fill="currentColor" stroke="none" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  );
}

export default function Header({
  scenario, isSample, canEdit, saveStatus, presenting,
  onPresent, onExitPresent, onPrint, onOpenTheme, onTitleChange,
  onSaveAsNew, user
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const titleRef = useRef(null);
  const dropdownRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    if (editingTitle && titleRef.current) titleRef.current.focus();
  }, [editingTitle]);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleTitleClick = () => {
    if (!canEdit) return;
    setTitleDraft(scenario.title || '');
    setEditingTitle(true);
  };

  const handleTitleBlur = () => {
    setEditingTitle(false);
    if (titleDraft.trim() && titleDraft !== scenario.title) {
      onTitleChange(titleDraft.trim());
    }
  };

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') e.target.blur();
    if (e.key === 'Escape') setEditingTitle(false);
  };

  const handleSignOut = async () => {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    setDropdownOpen(false);
    router.push('/');
    router.refresh();
  };

  const getInitials = () => {
    if (!user) return '?';
    const name = user.user_metadata?.display_name || user.email || '';
    if (name.includes(' ')) {
      const parts = name.split(' ');
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const saveLabel = { saved: 'Saved', saving: 'Saving...', error: 'Save failed', unsaved: 'Unsaved' }[saveStatus] || '';

  return (
    <div className={'header-bar no-print' + (presenting ? ' compact' : '')}>
      <div className="header-inner">
        <div className="header-left">
          {scenario.label && <div className="header-label">{scenario.label}</div>}
          {editingTitle ? (
            <input
              ref={titleRef}
              className="header-title-input"
              value={titleDraft}
              onChange={e => setTitleDraft(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
            />
          ) : (
            <div className="header-title" onClick={handleTitleClick}
              style={canEdit ? { cursor: 'text' } : undefined}>
              {scenario.title}
            </div>
          )}
          {!presenting && scenario.subtitle && (
            <div className="header-subtitle">{scenario.subtitle}</div>
          )}
        </div>

        {!presenting && scenario.statusLabels && (
          <div className="header-center">
            <div className="status-legend">
              {Object.entries(scenario.statusLabels).map(([key, sl]) => (
                <div key={key} className="status-legend-item">
                  <span className="status-dot" style={{ background: sl.color }} />
                  <span>{sl.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="header-right">
          {/* Save indicator */}
          {!isSample && canEdit && !presenting && (
            <div className={'save-indicator' + (saveStatus === 'saving' ? ' saving' : '') + (saveStatus === 'error' ? ' error' : '')}>
              {saveStatus === 'saving' && '●'} {saveLabel}
            </div>
          )}

          {presenting ? (
            <button className="header-btn" onClick={onExitPresent}>✕ Exit</button>
          ) : (
            <>
              {/* Save as new (shown when viewing sample and logged in) */}
              {onSaveAsNew && (
                <button className="header-btn active" onClick={onSaveAsNew}>
                  <SaveIcon /> <span className="btn-label">Save as mine</span>
                </button>
              )}
              <button className="header-btn" onClick={onPresent}>
                <PlayIcon /> <span className="btn-label">Present</span>
              </button>
              <button className="header-btn" onClick={onPrint}>
                <PrintIcon /> <span className="btn-label">Print</span>
              </button>
              <button className="header-btn" onClick={onOpenTheme}>
                <PaletteIcon />
              </button>
            </>
          )}

          {/* User menu or sign in */}
          {user ? (
            <div className="user-menu" ref={dropdownRef}>
              <div className="user-avatar" onClick={() => setDropdownOpen(!dropdownOpen)}>
                {getInitials()}
              </div>
              {dropdownOpen && (
                <div className="user-dropdown">
                  <div style={{ padding: '10px 16px', fontSize: 12, color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
                    {user.user_metadata?.display_name || user.email}
                  </div>
                  <button className="user-dropdown-item" onClick={handleSignOut}>
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            !presenting && (
              <Link href="/auth/login" className="header-signin">Sign in</Link>
            )
          )}
        </div>
      </div>
    </div>
  );
}
