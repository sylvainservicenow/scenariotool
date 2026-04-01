'use client';
import { useState, useEffect, useCallback } from 'react';
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

  const loadData = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    setError(null);

    try {
      const sb = getSupabase();

      // Personal scenarios (no team)
      const { data: personal, error: e1 } = await sb
        .from('scenarios')
        .select('id, title, subtitle, updated_at, owner_id')
        .is('team_id', null)
        .eq('owner_id', user.id)
        .order('updated_at', { ascending: false });

      if (e1) console.warn('Scenarios fetch error:', e1);
      setScenarios(personal || []);

      // Get team memberships - simpler query, no join
      const { data: memberships, error: e2 } = await sb
        .from('team_members')
        .select('team_id, role')
        .eq('user_id', user.id);

      if (e2) console.warn('Memberships fetch error:', e2);

      // Fetch each team individually
      const teamList = [];
      for (const m of (memberships || [])) {
        const { data: team, error: e3 } = await sb
          .from('teams')
          .select('id, name, invite_code')
          .eq('id', m.team_id)
          .single();

        if (e3) { console.warn('Team fetch error:', e3); continue; }
        if (team) teamList.push({ ...team, role: m.role });
      }
      setTeams(teamList);

      // Team scenarios
      const ts = {};
      for (const t of teamList) {
        const { data: tsc, error: e4 } = await sb
          .from('scenarios')
          .select('id, title, subtitle, updated_at, owner_id')
          .eq('team_id', t.id)
          .order('updated_at', { ascending: false });

        if (e4) console.warn('Team scenarios error:', e4);
        ts[t.id] = tsc || [];
      }
      setTeamScenarios(ts);
    } catch (e) {
      console.error('Drawer loadData error:', e);
      setError('Failed to load data');
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (open && user) loadData();
    if (open) setConfirmDelete(null);
  }, [open, user, loadData]);

  const handleCreateTeam = async () => {
    if (!newTeamName.trim() || creating) return;
    setCreating(true);
    try {
      const sb = getSupabase();
      const { data, error: err } = await sb.rpc('create_team', { team_name: newTeamName.trim() });
      if (err) {
        console.error('Create team error:', err);
        setError('Failed to create team: ' + err.message);
      } else {
        console.log('Team created:', data);
        setNewTeamName('');
        await loadData();
      }
    } catch (e) {
      console.error('Create team exception:', e);
      setError('Failed to create team');
    }
    setCreating(false);
  };

  const handleDelete = async (id) => {
    if (confirmDelete !== id) { setConfirmDelete(id); return; }
    setConfirmDelete(null);
    if (onDelete) await onDelete(id);
    await loadData();
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

  const Item = ({ s, canDel }) => (
    <div className={'drawer-item' + (s.id === currentId ? ' active' : '')}>
      <div className="drawer-item-content" onClick={() => onSelect(s.id)} style={{ cursor: 'pointer' }}>
        <div className="drawer-item-title">{s.title}</div>
        <div className="drawer-item-sub">{fmt(s.updated_at)}</div>
      </div>
      {canDel && (
        <button className={'drawer-item-delete' + (confirmDelete === s.id ? ' confirm' : '')}
          onClick={() => handleDelete(s.id)}>
          {confirmDelete === s.id ? 'Confirm?' : '✕'}
        </button>
      )}
    </div>
  );

  return (
    <>
      <div className={'scenario-drawer-overlay' + (open ? ' open' : '')} onClick={onClose} />
      <div className={'scenario-drawer' + (open ? ' open' : '')}>
        <div className="drawer-header">
          <h2>Scenarios</h2>
          <button className="panel-close" onClick={onClose}>✕</button>
        </div>
        <div className="drawer-content">
          <button className="drawer-new-btn" onClick={onNew}>+ New scenario</button>

          {error && <div style={{ padding: '8px 20px', fontSize: 12, color: 'var(--sn-orange)' }}>{error}</div>}

          {loading && <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading...</div>}

          {!loading && scenarios.length > 0 && <>
            <div className="drawer-section-label">Personal</div>
            {scenarios.map(s => <Item key={s.id} s={s} canDel={true} />)}
          </>}

          {!loading && scenarios.length === 0 && teams.length === 0 && (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No scenarios yet. Create one above.
            </div>
          )}

          {!loading && teams.map(team => (
            <div key={team.id}>
              <div className="drawer-team-header">
                <span className="drawer-team-name">{team.name}</span>
                <button className="drawer-team-manage"
                  onClick={() => { setManagingTeam(team); setTeamModalOpen(true); }}>Manage</button>
              </div>
              {(teamScenarios[team.id] || []).map(s => (
                <Item key={s.id} s={s} canDel={s.owner_id === user?.id} />
              ))}
              {(!teamScenarios[team.id] || teamScenarios[team.id].length === 0) && (
                <div style={{ padding: '6px 20px', fontSize: 12, color: 'var(--text-muted)' }}>No scenarios</div>
              )}
            </div>
          ))}

          {!loading && (
            <div style={{ padding: '16px 16px 8px', borderTop: '1px solid var(--border-subtle)', marginTop: 12 }}>
              <div className="drawer-section-label" style={{ padding: '0 0 8px' }}>Create a team</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input className="modal-input" style={{ marginBottom: 0, flex: 1 }}
                  placeholder="Team name" value={newTeamName}
                  onChange={e => setNewTeamName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreateTeam()} />
                <button className="panel-btn primary" style={{ height: 38 }}
                  onClick={handleCreateTeam} disabled={creating || !newTeamName.trim()}>
                  {creating ? '...' : 'Create'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {teamModalOpen && managingTeam && (
        <TeamManager team={managingTeam}
          onClose={() => { setTeamModalOpen(false); setManagingTeam(null); loadData(); }} />
      )}
    </>
  );
}
