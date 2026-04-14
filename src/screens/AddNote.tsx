import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { getTote } from '../db/repo';
import type { Tote } from '../types';
import { writeEvent } from '../lib/events';

// Simple note capture — writes a note_added event whose payload carries the
// text. Surfaced as an action on in_yard, empty, and hold totes.
export default function AddNote() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const [tote, setTote] = useState<Tote | null>(null);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const t = await getTote(id);
      setTote(t ?? null);
    })();
  }, [id]);

  async function save() {
    if (!tote) return;
    const trimmed = text.trim();
    if (!trimmed) return;
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

  const trimmedLen = text.trim().length;

  return (
    <Layout title="Add Note" back={`/tote/${encodeURIComponent(tote.id)}`}>
      <div className="space-y-4">
        <div className="card p-4">
          <div className="label">Tote</div>
          <div className="text-lg font-bold">{tote.id}</div>
          <div className="text-ink-soft text-sm">{tote.currentQtyGal} gal</div>
        </div>

        <div className="card p-4">
          <label className="label block mb-2">Note</label>
          <textarea
            className="input min-h-[140px] py-3"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What should the next person know?"
            autoFocus
          />
          <p className="text-xs text-ink-muted mt-2">
            Notes appear on the tote's history. Use them for inspection results,
            condition observations, or handoff details.
          </p>
        </div>

        <button
          className="btn-primary w-full"
          disabled={saving || trimmedLen === 0}
          onClick={save}
        >
          {saving ? 'Saving…' : 'Save Note'}
        </button>
      </div>
    </Layout>
  );
}
