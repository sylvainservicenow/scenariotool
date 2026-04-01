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
  const [teamMenuFor, setTeamMenuFor] = useState(null); // scenario id with team menu open
  const teamMenuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (teamMenuRef.current && !teamMenuRef.current.contains(e.target)) setTeamMenuFor(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadData = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const sb = getSupabase();
      const { data: personal, error: e1 } = await sb.from('scenarios').select('id,title,subtitle,updated_at,owner_id,team_id').is('team_id', null).eq('owner_id', user.id).order('updated_at', { ascending: false });
      if (e1) console.warn('Scenarios fetch:', e1);
      setScenarios(personal || []);

      const { data: memberships, error: e2 } = await sb.from('team_members').select('team_id,role').eq('user_id', user.id);
      if (e2) console.warn('Memberships fetch:', e2);

      const teamList = [];
      for (const m of (memberships || [])) {
        const { data: team } = await sb.from('teams').select('id,name,invite_code').eq('id', m.team_id).single();
        if (team) teamList.push({ ...team, role: m.role });
      }
      setTeams(teamList);

      const ts = {};
      for (const t of teamList) {
        const { data: tsc } = await sb.from('scenarios').select('id,title,subtitle,updated_at,owner_id,team_id').eq('team_id', t.id).order('updated_at', { ascending: false });
        ts[t.id] = tsc || [];
      }
      setTeamScenarios(ts);
    } catch (e) { console.error('Drawer load error:', e); setError('Failed to load'); }
    setLoading(false);
  }, [user]);

  useEffect(() => { if (open && user) loadData(); if (open) { setConfirmDelete(null); setTeamMenuFor(null); } }, [open, user, loadData]);

  const handleCreateTeam = async () => {
    if (!newTeamName.trim() || creating) return;
    setCreating(true);
    try {
      const { error: err } = await getSupabase().rpc('create_team', { team_name: newTeamName.trim() });
      if (err) { console.error('Create team:', err); setError('Team create failed: ' + err.message); }
      else { setNewTeamName(''); await loadData(); }
    } catch (e) { console.error('Create team exception:', e); }
    setCreating(false);
  };

  const handleDelete = async (id) => {
    if (confirmDelete !== id) { setConfirmDelete(id); return; }
    setConfirmDelete(null);
    if (onDelete) await onDelete(id);
    await loadData();
  };

  const handleAssignTeam = async (scenarioId, teamId) => {
    try {
      const { error } = await getSupabase().from('scenarios').update({ team_id: teamId }).eq('id', scenarioId);
      if (error) { console.error('Assign team:', error); return; }
      setTeamMenuFor(null);
      await loadData();
    } catch (e) { console.error('Assign team exception:', e); }
  };

  const fmt = (d) => {
    if (!d) return '';
    const diff = Date.now() - new Date(d).getTime();
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
    if (diff < 604800000) return Math.floor(diff / 86400000) + 'd ago';
    return new Date(d).toLocaleDateString();
  };

  const Item = ({ s, canDel, showTeamMenu }) => (
    <div className={'drawer-item' + (s.id === currentId ? ' active' : '')} style={{ position: 'relative' }}>
      <div className="drawer-item-content" onClick={() => onSelect(s.id)} style={{ cursor: 'pointer' }}>
        <div className="drawer-item-title">{s.title}</div>
        <div className="drawer-item-sub">{fmt(s.updated_at)}</div>
      </div>
      <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
        {/* Team assign button */}
        {s.owner_id === user?.id && (
          <div style={{ position: 'relative' }} ref={teamMenuFor === s.id ? teamMenuRef : null}>
            <button
              onClick={() => setTeamMenuFor(teamMenuFor === s.id ? null : s.id)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '4px 5px', borderRadius: 4,
                fontSize: 12, color: s.team_id ? 'var(--bright-indigo)' : 'var(--text-muted)',
                opacity: teamMenuFor === s.id ? 1 : undefined,
                transition: 'all 0.15s',
              }}
              title="Assign to team"
            >
              👥
            </button>
            {teamMenuFor === s.id && (
              <div style={{
                position: 'absolute', right: 0, top: '100%', width: 180, background: 'var(--surface-1)',
                border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)', zIndex: 50, overflow: 'hidden'
              }}>
                <button onClick={() => handleAssignTeam(s.id, null)}
                  style={{
                    display: 'block', width: '100%', padding: '8px 14px', border: 'none', background: 'none',
                    textAlign: 'left', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-main)',
                    color: !s.team_id ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: !s.team_id ? 600 : 400,
                  }}
                  onMouseOver={e => e.target.style.background = 'var(--surface-2)'}
                  onMouseOut={e => e.target.style.background = 'none'}
                >
                  Personal {!s.team_id && '✓'}
                </button>
                {teams.map(t => (
                  <button key={t.id} onClick={() => handleAssignTeam(s.id, t.id)}
                    style={{
                      display: 'block', width: '100%', padding: '8px 14px', border: 'none', background: 'none',
                      textAlign: 'left', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-main)',
                      color: s.team_id === t.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontWeight: s.team_id === t.id ? 600 : 400,
                    }}
                    onMouseOver={e => e.target.style.background = 'var(--surface-2)'}
                    onMouseOut={e => e.target.style.background = 'none'}
                  >
                    {t.name} {s.team_id === t.id && '✓'}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {/* Delete button */}
        {canDel && (
          <button className={'drawer-item-delete' + (confirmDelete === s.id ? ' confirm' : '')}
            onClick={() => handleDelete(s.id)}>
            {confirmDelete === s.id ? 'Confirm?' : '✕'}
          </button>
        )}
      </div>
    </div>
  );

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
            {scenarios.map(s => <Item key={s.id} s={s} canDel={true} />)}
          </>}

          {!loading && scenarios.length === 0 && teams.length === 0 && (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No scenarios yet.</div>
          )}

          {!loading && teams.map(team => (
            <div key={team.id}>
              <div className="drawer-team-header">
                <span className="drawer-team-name">{team.name}</span>
                <button className="drawer-team-manage" onClick={() => { setManagingTeam(team); setTeamModalOpen(true); }}>Manage</button>
              </div>
              {(teamScenarios[team.id] || []).map(s => <Item key={s.id} s={s} canDel={s.owner_id === user?.id} />)}
              {(!teamScenarios[team.id] || teamScenarios[team.id].length === 0) && (
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
        <TeamManager team={managingTeam} onDeleteTeam={() => { setTeamModalOpen(false); setManagingTeam(null); loadData(); }}
          onClose={() => { setTeamModalOpen(false); setManagingTeam(null); loadData(); }} />
      )}
    </>
  );
}
