'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getSupabase } from '@/lib/supabase-browser';

export default function TeamManager({ team, onClose, onDeleteTeam }) {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [confirmDeleteTeam, setConfirmDeleteTeam] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isOwner = team.role === 'owner';
  const inviteUrl = typeof window !== 'undefined' ? window.location.origin + '/join/' + team.invite_code : '';

  useEffect(() => {
    const load = async () => {
      const sb = getSupabase();
      // Fetch all members - need a workaround since RLS only shows own memberships
      // Owner can see all via the RPC or we fetch profiles separately
      const { data, error } = await sb
        .from('team_members')
        .select('user_id, role, joined_at')
        .eq('team_id', team.id);

      if (error) {
        console.warn('Team members fetch error:', error);
        // Fallback: at minimum show self
        setMembers([{
          userId: user?.id,
          role: team.role,
          displayName: user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'You'
        }]);
        setLoading(false);
        return;
      }

      // Fetch profiles for each member
      const memberList = [];
      for (const m of (data || [])) {
        const { data: profile } = await sb
          .from('profiles')
          .select('display_name')
          .eq('id', m.user_id)
          .single();
        memberList.push({
          userId: m.user_id,
          role: m.role,
          displayName: profile?.display_name || 'Unknown'
        });
      }
      setMembers(memberList);
      setLoading(false);
    };
    load();
  }, [team.id, team.role, user]);

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const changeRole = async (uid, role) => {
    const { error } = await getSupabase().from('team_members').update({ role }).eq('team_id', team.id).eq('user_id', uid);
    if (error) { console.warn('Change role error:', error); return; }
    setMembers(p => p.map(m => m.userId === uid ? { ...m, role } : m));
  };

  const remove = async (uid) => {
    const { error } = await getSupabase().from('team_members').delete().eq('team_id', team.id).eq('user_id', uid);
    if (error) { console.warn('Remove member error:', error); return; }
    setMembers(p => p.filter(m => m.userId !== uid));
  };

  const handleDeleteTeam = async () => {
    if (!confirmDeleteTeam) { setConfirmDeleteTeam(true); return; }
    setDeleting(true);
    try {
      const sb = getSupabase();
      // Unlink all scenarios from this team (set team_id to null)
      await sb.from('scenarios').update({ team_id: null }).eq('team_id', team.id);
      // Delete team (cascade deletes team_members)
      const { error } = await sb.from('teams').delete().eq('id', team.id);
      if (error) { console.error('Delete team error:', error); alert('Failed to delete team: ' + error.message); setDeleting(false); return; }
      if (onDeleteTeam) onDeleteTeam(team.id);
      onClose();
    } catch (e) {
      console.error('Delete team exception:', e);
      setDeleting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{team.name}</h2>
          <button className="panel-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {/* Invite link */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, letterSpacing: 0.5, textTransform: 'uppercase' }}>Invite link</div>
            <div className="invite-link-box">
              <code>{inviteUrl}</code>
              <button onClick={handleCopy}>{copied ? 'Copied!' : 'Copy'}</button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Share this link. New members join as viewers.</div>
          </div>

          {/* Members */}
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase' }}>
            Members ({members.length})
          </div>
          {loading && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading...</div>}
          {members.map(m => (
            <div key={m.userId} className="member-row">
              <div className="member-avatar">{m.displayName.slice(0, 2).toUpperCase()}</div>
              <div className="member-info">
                <div className="member-name">
                  {m.displayName}
                  {m.userId === user?.id && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>(you)</span>}
                </div>
                <div className="member-role">{m.role}</div>
              </div>
              {isOwner && m.userId !== user?.id && (
                <div className="member-actions">
                  {m.role === 'viewer' && <button className="member-action-btn" onClick={() => changeRole(m.userId, 'editor')}>→ Editor</button>}
                  {m.role === 'editor' && <button className="member-action-btn" onClick={() => changeRole(m.userId, 'viewer')}>→ Viewer</button>}
                  <button className="member-action-btn danger" onClick={() => remove(m.userId)}>Remove</button>
                </div>
              )}
              {!isOwner && m.userId === user?.id && (
                <div className="member-actions">
                  <button className="member-action-btn danger" onClick={() => remove(m.userId)}>Leave</button>
                </div>
              )}
            </div>
          ))}

          {/* Delete team (owner only) */}
          {isOwner && (
            <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                Danger zone
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10 }}>
                Deleting this team removes all members. Scenarios linked to this team will become personal (unlinked).
              </div>
              <button
                className="panel-btn"
                style={confirmDeleteTeam
                  ? { background: 'var(--sn-orange)', color: 'white', borderColor: 'var(--sn-orange)' }
                  : { color: 'var(--sn-orange)', borderColor: 'rgba(207,74,0,0.3)' }}
                onClick={handleDeleteTeam}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : confirmDeleteTeam ? 'Click again to confirm deletion' : 'Delete team'}
              </button>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="panel-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
