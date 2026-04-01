'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getSupabase } from '@/lib/supabase-browser';
import TeamManager from './TeamManager';

export default function ScenarioDrawer({ open, onClose, currentId, onSelect, onNew, onDelete }) {
  const { user } = useAuth();
  const [scenarios, setScenarios] = useState([]);
  const [teams, setTeams] = useState([]);
  const [teamScenarios, setTeamScenarios] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [managingTeam, setManagingTeam] = useState(null);
  const [newTeamName, setNewTeamName] = useState('');
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [menuFor, setMenuFor] = useState(null); // scenario id with context menu open
  const [copiedLink, setCopiedLink] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const h = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuFor(null); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);

  const loadData = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const sb = getSupabase();
      const { data: personal } = await sb.from('scenarios').select('id,title,updated_at,owner_id,team_id,is_public,public_token').is('team_id', null).eq('owner_id', user.id).order('updated_at', { ascending: false });
      setScenarios(personal || []);
      const { data: memberships } = await sb.from('team_members').select('team_id,role').eq('user_id', user.id);
      const tl = [];
      for (const m of (memberships || [])) {
        const { data: t } = await sb.from('teams').select('id,name,invite_code').eq('id', m.team_id).single();
        if (t) tl.push({ ...t, role: m.role });
      }
      setTeams(tl);
      const ts = {};
      for (const t of tl) {
        const { data: sc } = await sb.from('scenarios').select('id,title,updated_at,owner_id,team_id,is_public,public_token').eq('team_id', t.id).order('updated_at', { ascending: false });
        ts[t.id] = sc || [];
      }
      setTeamScenarios(ts);
    } catch (e) { console.error('Drawer:', e); setError('Failed to load'); }
    setLoading(false);
  }, [user]);

  useEffect(() => { if (open && user) loadData(); if (open) { setConfirmDelete(null); setMenuFor(null); } }, [open, user, loadData]);

  const handleCreateTeam = async () => {
    if (!newTeamName.trim() || creating) return;
    setCreating(true);
    const { error: err } = await getSupabase().rpc('create_team', { team_name: newTeamName.trim() });
    if (err) setError('Team failed: ' + err.message); else { setNewTeamName(''); await loadData(); }
    setCreating(false);
  };

  const handleDelete = async (id) => {
    if (confirmDelete !== id) { setConfirmDelete(id); return; }
    setConfirmDelete(null); if (onDelete) await onDelete(id); await loadData();
  };

  const handleTogglePublic = async (s) => {
    const newVal = !s.is_public;
    const { error } = await getSupabase().from('scenarios').update({ is_public: newVal }).eq('id', s.id);
    if (error) { console.error('Toggle public:', error); return; }
    await loadData();
  };

  const handleCopyPublicLink = (s) => {
    if (!s.public_token) return;
    const url = window.location.origin + '/view/' + s.public_token;
    navigator.clipboard.writeText(url);
    setCopiedLink(s.id);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const handleAssignTeam = async (sid, tid) => {
    const { error } = await getSupabase().from('scenarios').update({ team_id: tid }).eq('id', sid);
    if (error) console.error('Assign:', error);
    setMenuFor(null); await loadData();
  };

  const fmt = (d) => { if (!d) return ''; const diff = Date.now()-new Date(d).getTime(); if (diff<60e3) return 'now'; if (diff<36e5) return Math.floor(diff/6e4)+'m'; if (diff<864e5) return Math.floor(diff/36e5)+'h'; if (diff<6048e5) return Math.floor(diff/864e5)+'d'; return new Date(d).toLocaleDateString(); };

  const Item = ({ s, canDel }) => {
    const isOwner = s.owner_id === user?.id;
    const menuOpen = menuFor === s.id;

    return (
      <div className={'drawer-item' + (s.id === currentId ? ' active' : '')} style={{ position: 'relative' }}>
        <div className="drawer-item-content" onClick={() => onSelect(s.id)} style={{ cursor: 'pointer' }}>
          <div className="drawer-item-title">
            {s.is_public && <span title="Public" style={{ marginRight: 4 }}>🌐</span>}
            {s.title}
          </div>
          <div className="drawer-item-sub">{fmt(s.updated_at)}</div>
        </div>
        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
          {/* Context menu button */}
          {isOwner && (
            <div style={{ position: 'relative' }} ref={menuOpen ? menuRef : null}>
              <button onClick={() => setMenuFor(menuOpen ? null : s.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 4, fontSize: 14, color: 'var(--text-muted)', transition: '0.15s', opacity: menuOpen ? 1 : undefined }}
                className="drawer-item-delete">⋯</button>
              {menuOpen && (
                <div style={{
                  position: 'absolute', right: 0, top: '100%', width: 200, background: 'var(--surface-1)',
                  border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-lg)', zIndex: 50, overflow: 'hidden'
                }}>
                  {/* Public toggle */}
                  <button className="user-dropdown-item" onClick={() => { handleTogglePublic(s); setMenuFor(null); }}>
                    {s.is_public ? '🔒 Make private' : '🌐 Make public'}
                  </button>
                  {/* Copy public link */}
                  {s.is_public && s.public_token && (
                    <button className="user-dropdown-item" onClick={() => { handleCopyPublicLink(s); setMenuFor(null); }}>
                      {copiedLink === s.id ? '✓ Copied!' : '🔗 Copy public link'}
                    </button>
                  )}
                  {/* Team assignment */}
                  <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '4px 0' }}>
                    <div style={{ padding: '4px 16px', fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: 0.5, textTransform: 'uppercase' }}>Team</div>
                    <button className="user-dropdown-item" style={!s.team_id ? { fontWeight: 600 } : undefined}
                      onClick={() => handleAssignTeam(s.id, null)}>Personal {!s.team_id && '✓'}</button>
                    {teams.map(t => (
                      <button key={t.id} className="user-dropdown-item" style={s.team_id === t.id ? { fontWeight: 600 } : undefined}
                        onClick={() => handleAssignTeam(s.id, t.id)}>{t.name} {s.team_id === t.id && '✓'}</button>
                    ))}
                  </div>
                  {/* Delete */}
                  <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    <button className="user-dropdown-item" style={{ color: 'var(--sn-orange)' }}
                      onClick={() => { setMenuFor(null); handleDelete(s.id); }}>
                      {confirmDelete === s.id ? 'Confirm delete?' : 'Delete'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className={'scenario-drawer-overlay' + (open ? ' open' : '')} onClick={onClose} />
      <div className={'scenario-drawer' + (open ? ' open' : '')}>
        <div className="drawer-header"><h2>Scenarios</h2><button className="panel-close" onClick={onClose}>✕</button></div>
        <div className="drawer-content">
          <button className="drawer-new-btn" onClick={onNew}>+ New scenario</button>

          {error && <div style={{ padding: '8px 20px', fontSize: 12, color: 'var(--sn-orange)' }}>{error}</div>}
          {loading && <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading...</div>}

          {!loading && scenarios.length > 0 && <>
            <div className="drawer-section-label">Personal</div>
            {scenarios.map(s => <Item key={s.id} s={s} canDel />)}
          </>}

          {!loading && !scenarios.length && !teams.length && (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No scenarios yet.</div>
          )}

          {!loading && teams.map(t => (
            <div key={t.id}>
              <div className="drawer-team-header">
                <span className="drawer-team-name">{t.name}</span>
                <button className="drawer-team-manage" onClick={() => { setManagingTeam(t); setTeamModalOpen(true); }}>Manage</button>
              </div>
              {(teamScenarios[t.id] || []).map(s => <Item key={s.id} s={s} canDel={s.owner_id === user?.id} />)}
              {(!teamScenarios[t.id] || !teamScenarios[t.id].length) && (
                <div style={{ padding: '6px 20px', fontSize: 12, color: 'var(--text-muted)' }}>No scenarios</div>
              )}
            </div>
          ))}

          {!loading && (
            <div style={{ padding: '16px 16px 8px', borderTop: '1px solid var(--border-subtle)', marginTop: 12 }}>
              <div className="drawer-section-label" style={{ padding: '0 0 8px' }}>Create a team</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input className="modal-input" style={{ marginBottom: 0, flex: 1 }} placeholder="Team name"
                  value={newTeamName} onChange={e => setNewTeamName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreateTeam()} />
                <button className="panel-btn primary" style={{ height: 38 }} onClick={handleCreateTeam}
                  disabled={creating || !newTeamName.trim()}>{creating ? '...' : 'Create'}</button>
              </div>
            </div>
          )}
        </div>
      </div>
      {teamModalOpen && managingTeam && (
        <TeamManager team={managingTeam}
          onDeleteTeam={() => { setTeamModalOpen(false); setManagingTeam(null); loadData(); }}
          onClose={() => { setTeamModalOpen(false); setManagingTeam(null); loadData(); }} />
      )}
    </>
  );
}
