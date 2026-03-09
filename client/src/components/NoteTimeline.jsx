import React, { useState, useEffect, useCallback } from 'react';
import { Send, Trash2, MessageSquare, Activity, Settings } from 'lucide-react';
import { getNotes, createNote, deleteNote } from '../api';
import { useConfirm } from '../context/ConfirmContext';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

const TYPE_CONFIG = {
  note:          { icon: MessageSquare, color: '#3b82f6', label: 'Note' },
  status_change: { icon: Activity,      color: '#f59e0b', label: 'Status Change' },
  system:        { icon: Settings,      color: '#94a3b8', label: 'System' },
};

export default function NoteTimeline({ entityType, entityId, author = 'User' }) {
  const confirm = useConfirm();
  const [notes, setNotes] = useState([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!entityId) return;
    setLoading(true);
    try {
      const res = await getNotes(entityType, entityId);
      setNotes(res.data);
    } catch { }
    setLoading(false);
  }, [entityType, entityId]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!content.trim()) return;
    try {
      await createNote({ entity_type: entityType, entity_id: entityId, content: content.trim(), author });
      setContent('');
      load();
    } catch { }
  };

  const handleDelete = async (id) => {
    if (!(await confirm('Delete this note?'))) return;
    try {
      await deleteNote(id);
      load();
    } catch { }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="page-card" style={{ marginTop: 16 }}>
      <div className="page-card-header">
        <span className="rc-results-count" style={{ fontWeight: 700, fontSize: 15 }}>Notes & Activity</span>
        <span className="filter-count">{notes.length} note{notes.length !== 1 ? 's' : ''}</span>
      </div>
      <div style={{ padding: 16 }}>
        {/* Add note */}
        <div className="note-input-area">
          <textarea
            className="form-input"
            value={content}
            onChange={e => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a note… (Ctrl+Enter to submit)"
            style={{ fontSize: 13 }}
          />
          <button className="btn btn-primary" onClick={handleAdd} disabled={!content.trim()} style={{ alignSelf: 'flex-end' }}>
            <Send size={14} />
          </button>
        </div>

        {/* Timeline */}
        {loading ? (
          <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>Loading…</div>
        ) : notes.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
            No notes yet. Add the first one above.
          </div>
        ) : (
          <div className="timeline">
            {notes.map(note => {
              const cfg = TYPE_CONFIG[note.note_type] || TYPE_CONFIG.note;
              const Icon = cfg.icon;
              return (
                <div key={note.notes_id} className="timeline-item">
                  <div className="timeline-dot" style={{ background: cfg.color, boxShadow: `0 0 0 2px ${cfg.color}` }} />
                  <div className="timeline-content">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Icon size={13} color={cfg.color} />
                        <span style={{ fontWeight: 700, fontSize: 12, color: cfg.color }}>{note.author}</span>
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>·</span>
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>{cfg.label}</span>
                      </div>
                      <button className="btn btn-ghost btn-sm btn-icon" onClick={() => handleDelete(note.notes_id)} title="Delete note">
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <div style={{ fontSize: 13, marginTop: 4, whiteSpace: 'pre-wrap' }}>{note.content}</div>
                    <div className="timeline-meta">
                      {dayjs(note.created_at).fromNow()} · {dayjs(note.created_at).format('MMM D, YYYY h:mm A')}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
