import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { getTote } from '../db/repo';
import type { Tote } from '../types';
import { writeEvent } from '../lib/events';

export default function DiscardTote() {
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
      type: 'discarded',
      payload: { note },
      createdBy: 'jacob',
      toteUpdates: { status: 'discarded' },
      updatedLabel: 'Discarded',
    });
    nav(`/tote/${encodeURIComponent(tote.id)}`);
  }

  if (!tote) return <Layout title="Loading…" back={`/tote/${id}`}><div /></Layout>;

  return (
    <Layout title="Discard Tote" back={`/tote/${encodeURIComponent(tote.id)}`}>
      <div className="space-y-4">
        <div className="card p-4 border-red-200 bg-red-50">
          <div className="text-sm text-red-800">
            Discarding retires this tote from service. History is preserved but
            it will no longer appear in active inventory.
          </div>
        </div>
        <div className="card p-4">
          <div className="label">Tote</div>
          <div className="text-lg font-bold">{tote.id}</div>
        </div>
        <div className="card p-4">
          <label className="label block mb-2">Reason / Note</label>
          <textarea
            className="input min-h-[80px] py-3"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Why is this tote being discarded?"
          />
        </div>
        <button className="btn-danger w-full" disabled={saving} onClick={save}>
          {saving ? 'Discarding…' : 'Confirm Discard'}
        </button>
      </div>
    </Layout>
  );
}
