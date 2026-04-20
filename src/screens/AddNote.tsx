import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { getTote } from '../db/repo';
import { currentActorId } from '../db/auth';
import type { Tote } from '../types';
import { writeEvent } from '../lib/events';

export default function AddNote() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const state = useLocation().state;
  const [tote, setTote] = useState<Tote | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => { setTote((await getTote(id)) ?? null); })();
  }, [id]);

  async function save() {
    const trimmed = note.trim();
    if (!tote || !trimmed) return;
    setSaving(true);
    await writeEvent({
      tote,
      type: 'note_added',
      payload: { note: trimmed },
      createdBy: currentActorId(),
      updatedLabel: 'Note added',
    });
    nav(`/tote/${encodeURIComponent(tote.id)}`, { state });
  }

  if (!tote) return <Layout title="Loading…" back={`/tote/${id}`} backState={state}><div /></Layout>;

  return (
    <Layout title="Add Note" back={`/tote/${encodeURIComponent(tote.id)}`} backState={state}>
      <div className="space-y-3">
        <div className="card p-3">
          <div className="label">Tote</div>
          <div className="text-sm font-semibold">{tote.id}</div>
        </div>
        <div className="card p-3">
          <label className="label block mb-1">Note</label>
          <textarea
            className="input min-h-[80px] py-2"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            autoFocus
          />
        </div>
        <button
          className="btn-primary w-full"
          disabled={!note.trim() || saving}
          onClick={save}
        >
          {saving ? 'Saving…' : 'Save Note'}
        </button>
      </div>
    </Layout>
  );
}
