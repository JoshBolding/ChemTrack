import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { getTote } from '../db/repo';
import type { Tote, ToteStatus } from '../types';
import { TOTE_CAPACITY_GAL } from '../types';
import { writeEvent } from '../lib/events';

type Condition = 'full' | 'partial' | 'empty' | 'damaged';

export default function ReturnToYard() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const [tote, setTote] = useState<Tote | null>(null);
  const [qty, setQty] = useState('0');
  const [condition, setCondition] = useState<Condition>('partial');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const t = await getTote(id);
      setTote(t ?? null);
      if (t) setQty(String(t.currentQtyGal));
    })();
  }, [id]);

  async function save() {
    if (!tote) return;
    // Condition drives both the saved qty and the destination status, so the
    // button the user taps actually matches the outcome that gets persisted.
    const rawQty = Math.max(0, Math.min(TOTE_CAPACITY_GAL, Number(qty) || 0));
    const qtyNum =
      condition === 'empty'
        ? 0
        : condition === 'full'
          ? TOTE_CAPACITY_GAL
          : rawQty;
    const newStatus: ToteStatus =
      condition === 'damaged'
        ? 'hold'
        : condition === 'empty' || qtyNum === 0
          ? 'empty'
          : 'in_yard';
    setSaving(true);
    await writeEvent({
      tote,
      type: 'returned_to_yard',
      payload: { qtyNum, condition, note },
      createdBy: 'jacob',
      toteUpdates: {
        status: newStatus,
        location: { kind: condition === 'damaged' ? 'hold' : 'yard' },
        jobId: undefined,
        currentQtyGal: qtyNum,
      },
      updatedLabel: 'Returned to yard',
    });
    nav(`/tote/${encodeURIComponent(tote.id)}`);
  }

  if (!tote) return <Layout title="Loading…" back={`/tote/${id}`}><div /></Layout>;

  return (
    <Layout title="Return to Yard" back={`/tote/${encodeURIComponent(tote.id)}`}>
      <div className="space-y-4">
        <div className="card p-4">
          <div className="label">Tote</div>
          <div className="text-lg font-bold">{tote.id}</div>
          <div className="text-sm text-ink-soft">
            Currently {tote.currentQtyGal} gal
          </div>
        </div>

        <div className="card p-4">
          <label className="label block mb-2">Returned Qty (gal)</label>
          <input
            className="input text-2xl font-bold"
            type="number"
            inputMode="numeric"
            min={0}
            max={TOTE_CAPACITY_GAL}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
          />
        </div>

        <div className="card p-4">
          <div className="label mb-2">Condition</div>
          <div className="grid grid-cols-2 gap-2">
            {(['full', 'partial', 'empty', 'damaged'] as Condition[]).map(
              (c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setCondition(c);
                    // Snap qty to the canonical value for full/empty so the
                    // selected condition and the saved value never disagree.
                    if (c === 'full') setQty(String(TOTE_CAPACITY_GAL));
                    else if (c === 'empty') setQty('0');
                  }}
                  className={
                    condition === c
                      ? c === 'damaged'
                        ? 'btn-danger'
                        : 'btn-primary'
                      : 'btn-secondary'
                  }
                >
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </button>
              )
            )}
          </div>
          <p className="text-xs text-ink-muted mt-2">
            Full/Empty lock the quantity automatically; Partial and Damaged let
            you enter the returned gallons above.
          </p>
        </div>

        <div className="card p-4">
          <label className="label block mb-2">Note (optional)</label>
          <textarea
            className="input min-h-[80px] py-3"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <button
          className="btn-primary w-full"
          disabled={saving}
          onClick={save}
        >
          {saving ? 'Saving…' : 'Save Return'}
        </button>
      </div>
    </Layout>
  );
}
