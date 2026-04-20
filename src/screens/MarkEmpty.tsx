import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { getTote } from '../db/repo';
import { currentActorId } from '../db/auth';
import type { Tote } from '../types';
import { writeEvent } from '../lib/events';

export default function MarkEmpty() {
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
    if (!tote) return;
    setSaving(true);
    await writeEvent({
      tote,
      type: 'marked_empty',
      payload: { note },
      createdBy: currentActorId(),
      toteUpdates: { status: 'empty', currentQtyGal: 0 },
      updatedLabel: 'Marked empty',
    });
    nav(`/tote/${encodeURIComponent(tote.id)}`, { state });
  }

  if (!tote) return <Layout title="Loading…" back={`/tote/${id}`} backState={state}><div /></Layout>;

  return (
    <Layout title="Mark Empty" back={`/tote/${encodeURIComponent(tote.id)}`} backState={state}>
      <div className="space-y-3">
        <div className="card p-3">
          <div className="label">Tote</div>
          <div className="text-sm font-semibold">{tote.id}</div>
          <div className="text-xs text-ink-muted">Sets quantity to 0 and marks empty.</div>
        </div>
        <div className="card p-3">
          <label className="label block mb-1">Note (optional)</label>
          <textarea className="input min-h-[64px] py-2" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <button className="btn-primary w-full" disabled={saving} onClick={save}>
          {saving ? 'Saving…' : 'Confirm Mark Empty'}
        </button>
      </div>
    </Layout>
  );
}
