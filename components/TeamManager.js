'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getSupabase } from '@/lib/supabase-browser';

export default function TeamManager({ team, onClose }) {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const isOwner = team.role === 'owner';
  const inviteUrl = typeof window !== 'undefined' ? window.location.origin + '/join/' + team.invite_code : '';

  useEffect(() => {
    const load = async () => {
      const { data } = await getSupabase().from('team_members').select('user_id,role,joined_at,profiles(display_name)').eq('team_id', team.id);
      setMembers((data || []).map(m => ({ userId: m.user_id, role: m.role, displayName: m.profiles?.display_name || 'Unknown' })));
      setLoading(false);
    };
    load();
  }, [team.id]);

  const handleCopy = () => { navigator.clipboard.writeText(inviteUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const changeRole = async (uid, role) => { await getSupabase().from('team_members').update({ role }).eq('team_id', team.id).eq('user_id', uid); setMembers(p => p.map(m => m.userId === uid ? { ...m, role } : m)); };
  const remove = async (uid) => { await getSupabase().from('team_members').delete().eq('team_id', team.id).eq('user_id', uid); setMembers(p => p.filter(m => m.userId !== uid)); };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h2>{team.name}</h2><button className="panel-close" onClick={onClose}>✕</button></div>
        <div className="modal-body">
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, letterSpacing: 0.5, textTransform: 'uppercase' }}>Invite link</div>
            <div className="invite-link-box"><code>{inviteUrl}</code><button onClick={handleCopy}>{copied ? 'Copied!' : 'Copy'}</button></div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Share this link. New members join as viewers.</div>
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase' }}>Members ({members.length})</div>
          {loading && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading...</div>}
          {members.map(m => (
            <div key={m.userId} className="member-row">
              <div className="member-avatar">{m.displayName.slice(0, 2).toUpperCase()}</div>
              <div className="member-info">
                <div className="member-name">{m.displayName}{m.userId === user?.id && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>(you)</span>}</div>
                <div className="member-role">{m.role}</div>
              </div>
              {isOwner && m.userId !== user?.id && (
                <div className="member-actions">
                  {m.role === 'viewer' && <button className="member-action-btn" onClick={() => changeRole(m.userId, 'editor')}>→ Editor</button>}
                  {m.role === 'editor' && <button className="member-action-btn" onClick={() => changeRole(m.userId, 'viewer')}>→ Viewer</button>}
                  <button className="member-action-btn danger" onClick={() => remove(m.userId)}>Remove</button>
                </div>
              )}
              {!isOwner && m.userId === user?.id && <div className="member-actions"><button className="member-action-btn danger" onClick={() => remove(m.userId)}>Leave</button></div>}
            </div>
          ))}
        </div>
        <div className="modal-footer"><button className="panel-btn" onClick={onClose}>Close</button></div>
      </div>
    </div>
  );
}
