import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { getTote } from '../db/repo';
import type { Tote } from '../types';
import { writeEvent } from '../lib/events';

export default function MarkEmpty() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const [tote, setTote] = useState<Tote | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      setTote((await getTote(id)) ?? null);
    })();
  }, [id]);

  async function save() {
    if (!tote) return;
    setSaving(true);
    await writeEvent({
      tote,
      type: 'marked_empty',
      payload: { note },
      createdBy: 'operator',
      toteUpdates: { status: 'empty', currentQtyGal: 0 },
      updatedLabel: 'Marked empty',
    });
    nav(`/tote/${encodeURIComponent(tote.id)}`);
  }

  if (!tote) return <Layout title="Loading…" back={`/tote/${id}`}><div /></Layout>;

  return (
    <Layout title="Mark Empty" back={`/tote/${encodeURIComponent(tote.id)}`}>
      <div className="space-y-4">
        <div className="card p-4">
          <div className="label">Tote</div>
          <div className="text-lg font-bold">{tote.id}</div>
          <div className="text-sm text-ink-soft">
            This will set quantity to 0 and mark the tote empty.
          </div>
        </div>
        <div className="card p-4">
          <label className="label block mb-2">Note (optional)</label>
          <textarea
            className="input min-h-[80px] py-3"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <button className="btn-primary w-full" disabled={saving} onClick={save}>
          {saving ? 'Saving…' : 'Confirm Mark Empty'}
        </button>
      </div>
    </Layout>
  );
}
