'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getSupabase } from '@/lib/supabase-browser';
import TeamManager from './TeamManager';

export default function ScenarioDrawer({ open, onClose, currentId, onSelect, onNew, onDelete, onImportJSON }) {
  const { user } = useAuth();
  const [scenarios, setScenarios] = useState([]);
  const [teams, setTeams] = useState([]);
  const [teamScenarios, setTeamScenarios] = useState({});
  const [loading, setLoading] = useState(true);
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [managingTeam, setManagingTeam] = useState(null);
  const [newTeamName, setNewTeamName] = useState('');
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const supabase = getSupabase();

    const { data: personal } = await supabase
      .from('scenarios')
      .select('id, title, subtitle, updated_at, owner_id')
      .is('team_id', null)
      .eq('owner_id', user.id)
      .order('updated_at', { ascending: false });

    setScenarios(personal || []);

    const { data: memberships } = await supabase
      .from('team_members')
      .select('team_id, role, teams(id, name, invite_code)')
      .eq('user_id', user.id);

    const teamList = (memberships || []).map(m => ({
      ...m.teams,
      role: m.role,
    }));
    setTeams(teamList);

    const ts = {};
    for (const team of teamList) {
      const { data: teamSc } = await supabase
        .from('scenarios')
        .select('id, title, subtitle, updated_at, owner_id')
        .eq('team_id', team.id)
        .order('updated_at', { ascending: false });
      ts[team.id] = teamSc || [];
    }
    setTeamScenarios(ts);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (open && user) loadData();
    if (open) setConfirmDelete(null);
  }, [open, user, loadData]);

  const handleCreateTeam = async () => {
    if (!newTeamName.trim() || creating) return;
    setCreating(true);
    const supabase = getSupabase();
    await supabase.rpc('create_team', { team_name: newTeamName.trim() });
    setNewTeamName('');
    setCreating(false);
    loadData();
  };

  const handleDelete = async (id) => {
    if (confirmDelete !== id) {
      setConfirmDelete(id);
      return;
    }
    setConfirmDelete(null);
    if (onDelete) await onDelete(id);
    loadData();
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

  const ScenarioItem = ({ s, isOwner }) => (
    <div
      className={'drawer-item' + (s.id === currentId ? ' active' : '')}
      style={{ display: 'flex', alignItems: 'center', gap: 8 }}
    >
      <button
        style={{ flex: 1, background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-main)' }}
        onClick={() => onSelect(s.id)}
      >
        <div className="drawer-item-title">{s.title}</div>
        <div className="drawer-item-sub">{formatDate(s.updated_at)}</div>
      </button>
      {isOwner && (
        <button
          onClick={() => handleDelete(s.id)}
          style={{
            flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 11, color: confirmDelete === s.id ? '#CF4A00' : 'var(--text-muted)',
            fontFamily: 'var(--font-main)', fontWeight: confirmDelete === s.id ? 600 : 400,
            padding: '4px 6px', borderRadius: 4,
            transition: 'all 0.15s',
          }}
          title={confirmDelete === s.id ? 'Click again to confirm' : 'Delete'}
        >
          {confirmDelete === s.id ? 'Confirm?' : '×'}
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
          <button className="drawer-new-btn" onClick={onNew}>
            + New scenario
          </button>
          <button className="drawer-new-btn" style={{ marginTop: 0 }} onClick={onImportJSON}>
            ↑ Import JSON
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
                <ScenarioItem key={s.id} s={s} isOwner={s.owner_id === user?.id} />
              ))}
            </>
          )}

          {!loading && scenarios.length === 0 && teams.length === 0 && (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No scenarios yet. Create one or import a JSON file.
            </div>
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
                <ScenarioItem key={s.id} s={s} isOwner={s.owner_id === user?.id} />
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
