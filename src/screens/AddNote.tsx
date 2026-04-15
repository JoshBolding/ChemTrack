import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { getTote } from '../db/repo';
import type { Tote } from '../types';
import { writeEvent } from '../lib/events';

export default function AddNote() {
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
    const trimmed = note.trim();
    if (!tote || !trimmed) return;
    setSaving(true);
    await writeEvent({
      tote,
      type: 'note_added',
      payload: { note: trimmed },
      createdBy: 'jacob',
      updatedLabel: 'Note added',
    });
    nav(`/tote/${encodeURIComponent(tote.id)}`);
  }

  if (!tote) {
    return (
      <Layout title="Loading…" back={`/tote/${id}`}>
        <div />
      </Layout>
    );
  }

  return (
    <Layout title="Add Note" back={`/tote/${encodeURIComponent(tote.id)}`}>
      <div className="space-y-4">
        <section className="card animate-rise-in p-5">
          <div className="label">Tote</div>
          <div className="mt-1 text-lg font-black tracking-[-0.03em]">{tote.id}</div>
          <p className="page-intro mt-2">
            Capture field context, damage notes, or anything the next operator should see.
          </p>
        </section>

        <section className="card animate-rise-in delay-1 p-5">
          <label className="label mb-3 block">Note</label>
          <textarea
            className="input min-h-[160px] py-4"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Example: Tote arrived with a torn sleeve but product level looked clean."
            autoFocus
          />
        </section>

        <button
          className="btn-primary animate-rise-in delay-2 w-full"
          disabled={!note.trim() || saving}
          onClick={save}
        >
          {saving ? 'Saving…' : 'Save Note'}
        </button>
      </div>
    </Layout>
  );
}
