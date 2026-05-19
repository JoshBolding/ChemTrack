import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { getTote } from '../db/repo';
import type { Tote } from '../types';
import { writeEvent } from '../lib/events';
import { MessageSquareText } from 'lucide-react';

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
    if (!tote || !note.trim()) return;
    setSaving(true);
    await writeEvent({
      tote,
      type: 'note_added',
      payload: { note: note.trim() },
      createdBy: 'operator',
      updatedLabel: 'Note added',
    });
    nav(`/tote/${encodeURIComponent(tote.id)}`);
  }

  if (!tote) {
    return (
      <Layout title="Loading..." back={`/tote/${id}`}>
        <div />
      </Layout>
    );
  }

  return (
    <Layout title="Add Note" back={`/tote/${encodeURIComponent(tote.id)}`}>
      <div className="space-y-4">
        <section className="panel p-4">
          <div className="label">Tote</div>
          <div className="mt-1 font-mono text-2xl font-extrabold">{tote.id}</div>
          <div className="mt-1 text-sm text-ink-muted">
            Notes are saved into this tote's event history.
          </div>
        </section>

        <section className="panel p-4">
          <label className="label mb-2 flex items-center gap-2">
            <MessageSquareText size={15} />
            Note
          </label>
          <textarea
            className="input min-h-[160px] py-3"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add condition, handoff, label, or job context..."
          />
        </section>

        <button
          className="btn-primary w-full"
          disabled={saving || !note.trim()}
          onClick={save}
        >
          {saving ? 'Saving...' : 'Save Note'}
        </button>
      </div>
    </Layout>
  );
}
