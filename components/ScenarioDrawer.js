'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getSupabase } from '@/lib/supabase-browser';
import TeamManager from './TeamManager';

export default function ScenarioDrawer({ open, onClose, currentId, onSelect, onNew }) {
  const { user } = useAuth();
  const [scenarios, setScenarios] = useState([]);
  const [teams, setTeams] = useState([]);
  const [teamScenarios, setTeamScenarios] = useState({});
  const [loading, setLoading] = useState(true);
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [managingTeam, setManagingTeam] = useState(null);
  const [newTeamName, setNewTeamName] = useState('');
  const [creating, setCreating] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const supabase = getSupabase();

    // Personal scenarios
    const { data: personal } = await supabase
      .from('scenarios')
      .select('id, title, subtitle, updated_at')
      .is('team_id', null)
      .eq('owner_id', user.id)
      .order('updated_at', { ascending: false });

    setScenarios(personal || []);

    // Teams
    const { data: memberships } = await supabase
      .from('team_members')
      .select('team_id, role, teams(id, name, invite_code)')
      .eq('user_id', user.id);

    const teamList = (memberships || []).map(m => ({
      ...m.teams,
      role: m.role,
    }));
    setTeams(teamList);

    // Team scenarios
    const ts = {};
    for (const team of teamList) {
      const { data: teamSc } = await supabase
        .from('scenarios')
        .select('id, title, subtitle, updated_at')
        .eq('team_id', team.id)
        .order('updated_at', { ascending: false });
      ts[team.id] = teamSc || [];
    }
    setTeamScenarios(ts);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (open && user) loadData();
  }, [open, user, loadData]);

  const handleCreateTeam = async () => {
    if (!newTeamName.trim() || creating) return;
    setCreating(true);
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc('create_team', { team_name: newTeamName.trim() });
    if (!error) {
      setNewTeamName('');
      loadData();
    }
    setCreating(false);
  };

  const formatDate = (d) => {
    if (!d) return '';
    const date = new Date(d);
    const now = new Date();
    const diff = now - date;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
    if (diff < 604800000) return Math.floor(diff / 86400000) + 'd ago';
    return date.toLocaleDateString();
  };

  return (
    <>
      <div className={'scenario-drawer-overlay' + (open ? ' open' : '')} onClick={onClose} />
      <div className={'scenario-drawer' + (open ? ' open' : '')}>
        <div className="drawer-header">
          <h2>Scenarios</h2>
          <button className="panel-close" onClick={onClose}>✕</button>
        </div>

        <div className="drawer-content">
          <button className="drawer-new-btn" onClick={onNew}>
            + New scenario
          </button>

          {loading && (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Loading...
            </div>
          )}

          {!loading && scenarios.length > 0 && (
            <>
              <div className="drawer-section-label">Personal</div>
              {scenarios.map(s => (
                <button
                  key={s.id}
                  className={'drawer-item' + (s.id === currentId ? ' active' : '')}
                  onClick={() => onSelect(s.id)}
                >
                  <div className="drawer-item-title">{s.title}</div>
                  <div className="drawer-item-sub">{formatDate(s.updated_at)}</div>
                </button>
              ))}
            </>
          )}

          {!loading && teams.map(team => (
            <div key={team.id}>
              <div className="drawer-team-header">
                <span className="drawer-team-name">{team.name}</span>
                <button
                  className="drawer-team-manage"
                  onClick={() => { setManagingTeam(team); setTeamModalOpen(true); }}
                >
                  Manage
                </button>
              </div>
              {(teamScenarios[team.id] || []).map(s => (
                <button
                  key={s.id}
                  className={'drawer-item' + (s.id === currentId ? ' active' : '')}
                  onClick={() => onSelect(s.id)}
                >
                  <div className="drawer-item-title">{s.title}</div>
                  <div className="drawer-item-sub">{formatDate(s.updated_at)}</div>
                </button>
              ))}
              {(!teamScenarios[team.id] || teamScenarios[team.id].length === 0) && (
                <div style={{ padding: '6px 20px', fontSize: 12, color: 'var(--text-muted)' }}>
                  No scenarios yet
                </div>
              )}
            </div>
          ))}

          {/* Create team */}
          {!loading && (
            <div style={{ padding: '16px 16px 8px', borderTop: '1px solid var(--border-subtle)', marginTop: 12 }}>
              <div className="drawer-section-label" style={{ padding: '0 0 8px' }}>Create a team</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  className="modal-input"
                  style={{ marginBottom: 0, flex: 1 }}
                  placeholder="Team name"
                  value={newTeamName}
                  onChange={e => setNewTeamName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreateTeam()}
                />
                <button
                  className="panel-btn primary"
                  style={{ height: 38 }}
                  onClick={handleCreateTeam}
                  disabled={creating || !newTeamName.trim()}
                >
                  Create
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {teamModalOpen && managingTeam && (
        <TeamManager
          team={managingTeam}
          onClose={() => { setTeamModalOpen(false); setManagingTeam(null); loadData(); }}
        />
      )}
    </>
  );
}
