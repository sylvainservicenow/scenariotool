'use client';

import { useState, useEffect, useRef } from 'react';

function validateScenario(data) {
  if (!data || typeof data !== 'object') return 'Invalid JSON';
  if (!data.phases || !Array.isArray(data.phases)) return 'Missing "phases" array';
  if (!data.statusLabels || typeof data.statusLabels !== 'object') return 'Missing "statusLabels"';
  for (let i = 0; i < data.phases.length; i++) {
    const p = data.phases[i];
    if (!p.phase) return `Phase ${i + 1}: missing name`;
    if (!p.color) return `Phase "${p.phase}": missing color`;
    if (!p.steps || !Array.isArray(p.steps)) return `Phase "${p.phase}": missing steps`;
  }
  return null;
}

const DEFAULT_THEME = {
  fontMain: 'ServiceNow Sans', fontMono: 'ServiceNow Mono',
  headerBg1: '#032D42', headerBg2: '#054A6E', headerAccent: '#63DF4E',
  toolPillBg: 'rgba(82,184,255,0.1)', toolPillColor: '#035D99',
  toolPillBorder: 'rgba(82,184,255,0.25)',
  tooltipBg: '#032D42', tooltipAccent: '#63DF4E',
  pageBg: '#F0F2F5', cardBg: '#FFFFFF', cardBorder: 'rgba(3,45,66,0.08)',
  textPrimary: '#0A1929', textSecondary: '#3E5060', textMuted: '#7A8B9A'
};

const THEME_LABELS = {
  headerBg1: 'Header Primary', headerBg2: 'Header Secondary', headerAccent: 'Accent (Wasabi)',
  toolPillBg: 'Tool Pill Bg', toolPillColor: 'Tool Pill Text', toolPillBorder: 'Tool Pill Border',
  tooltipBg: 'Tooltip Bg', tooltipAccent: 'Tooltip Accent',
  pageBg: 'Page Background', cardBg: 'Card Background', cardBorder: 'Card Border',
  textPrimary: 'Text Primary', textSecondary: 'Text Secondary', textMuted: 'Text Muted'
};

function ThemeContent({ theme, onThemeChange, canEdit }) {
  const [mode, setMode] = useState('servicenow');
  const colorKeys = Object.keys(DEFAULT_THEME).filter(k => !k.startsWith('font'));

  const resetToSN = () => {
    setMode('servicenow');
    if (canEdit) onThemeChange({ ...DEFAULT_THEME });
  };

  const toHex = (val) => {
    if (!val) return '#000000';
    if (val.startsWith('#') && val.length >= 7) return val.slice(0, 7);
    if (val.startsWith('#') && val.length === 4)
      return '#' + val[1] + val[1] + val[2] + val[2] + val[3] + val[3];
    return '#000000';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div className="theme-toggle">
        <button className={mode === 'servicenow' ? 'active' : ''} onClick={resetToSN}>
          ServiceNow
        </button>
        <button className={mode === 'custom' ? 'active' : ''} onClick={() => setMode('custom')}>
          Custom
        </button>
      </div>
      <div className="theme-scroll">
        {colorKeys.map(key => {
          const val = (theme && theme[key]) || DEFAULT_THEME[key];
          const isRgba = val && val.startsWith('rgba');
          return (
            <div key={key} className="theme-row">
              <label>{THEME_LABELS[key] || key}</label>
              {isRgba ? (
                <input
                  type="text"
                  value={val}
                  disabled={mode !== 'custom' || !canEdit}
                  onChange={e => onThemeChange({ ...theme, [key]: e.target.value })}
                  style={{
                    width: 120, fontFamily: 'var(--font-mono)', fontSize: 11,
                    padding: '2px 6px', border: '1px solid var(--border-medium)', borderRadius: 4
                  }}
                />
              ) : (
                <input
                  type="color"
                  value={toHex(val)}
                  disabled={mode !== 'custom' || !canEdit}
                  onChange={e => onThemeChange({ ...theme, [key]: e.target.value })}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function LeftPanel({ open, onClose, data, canEdit, onApply, activeTab, setActiveTab }) {
  const [text, setText] = useState('');
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (open && data && activeTab === 'editor') {
      setText(JSON.stringify(data, null, 2));
      setDirty(false);
      setError(null);
    }
  }, [open, data, activeTab]);

  const handleApply = () => {
    if (!canEdit) return;
    try {
      const parsed = JSON.parse(text);
      const err = validateScenario(parsed);
      if (err) { setError(err); return; }
      setError(null);
      setDirty(false);
      onApply(parsed);
    } catch (e) {
      setError('Parse error: ' + e.message);
    }
  };

  const handleExportJSON = () => {
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'scenario_data.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleApply();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        const err = validateScenario(parsed);
        if (err) { setError(err); return; }
        if (canEdit) onApply(parsed);
        onClose();
      } catch (ex) {
        setError('Import error: ' + ex.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleThemeChange = (newTheme) => {
    if (!canEdit || !data) return;
    onApply({ ...data, theme: newTheme });
  };

  return (
    <>
      <div className={'left-panel-overlay' + (open ? ' open' : '')} onClick={onClose} />
      <div className={'left-panel' + (open ? ' open' : '')}>
        <div className="panel-header">
          <div className="panel-tabs">
            <button
              className={'panel-tab' + (activeTab === 'editor' ? ' active' : '')}
              onClick={() => setActiveTab('editor')}
            >
              Data
            </button>
            <button
              className={'panel-tab' + (activeTab === 'theme' ? ' active' : '')}
              onClick={() => setActiveTab('theme')}
            >
              Theme
            </button>
          </div>
          <div className="panel-actions">
            {activeTab === 'editor' && (
              <>
                {canEdit && (
                  <button className="panel-btn" onClick={() => fileRef.current?.click()}>
                    Import
                  </button>
                )}
                <button className="panel-btn" onClick={handleExportJSON}>Export</button>
                {canEdit && (
                  <button className="panel-btn primary" onClick={handleApply}>Apply</button>
                )}
              </>
            )}
            <button className="panel-close" onClick={onClose}>✕</button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>

        {activeTab === 'editor' && (
          <>
            <textarea
              className="editor-textarea"
              value={text}
              onChange={e => { setText(e.target.value); setDirty(true); setError(null); }}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              readOnly={!canEdit}
            />
            <div className="editor-status">
              <span>
                {error
                  ? <span style={{ color: '#CF4A00' }}>{error}</span>
                  : canEdit ? '⌘+Enter to apply' : 'Read-only (sign in to edit)'}
              </span>
              <span>
                {dirty && canEdit && (
                  <span style={{ color: '#CF4A00' }}>● Unsaved</span>
                )}
              </span>
            </div>
          </>
        )}

        {activeTab === 'theme' && (
          <ThemeContent
            theme={data?.theme || {}}
            onThemeChange={handleThemeChange}
            canEdit={canEdit}
          />
        )}
      </div>
    </>
  );
}
