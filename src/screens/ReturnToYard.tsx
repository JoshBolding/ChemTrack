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
      if (t) {
        setQty(String(t.currentQtyGal));
        setCondition(
          t.currentQtyGal === 0 ? 'empty'
            : t.currentQtyGal >= TOTE_CAPACITY_GAL ? 'full'
              : 'partial'
        );
      }
    })();
  }, [id]);

  function selectCondition(next: Condition) {
    setCondition(next);
    if (next === 'full') setQty(String(TOTE_CAPACITY_GAL));
    else if (next === 'empty') setQty('0');
    else if (tote) setQty(String(Math.min(TOTE_CAPACITY_GAL, Math.max(0, tote.currentQtyGal))));
  }

  async function save() {
    if (!tote) return;
    const qtyNum =
      condition === 'full' ? TOTE_CAPACITY_GAL
        : condition === 'empty' ? 0
          : Math.max(0, Math.min(TOTE_CAPACITY_GAL, Number(qty) || 0));
    setSaving(true);
    const newStatus: ToteStatus =
      condition === 'damaged' ? 'hold'
        : condition === 'empty' || qtyNum === 0 ? 'empty'
          : 'in_yard';
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
      <div className="space-y-3">
        <div className="card p-3">
          <div className="label">Tote</div>
          <div className="text-sm font-semibold">{tote.id}</div>
          <div className="text-xs text-ink-muted">Currently {tote.currentQtyGal} gal</div>
        </div>

        <div className="card p-3">
          <div className="label mb-1">Condition</div>
          <div className="grid grid-cols-2 gap-2">
            {(['full', 'partial', 'empty', 'damaged'] as Condition[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => selectCondition(c)}
                className={
                  condition === c
                    ? c === 'damaged' ? 'btn-danger' : 'btn-primary'
                    : 'btn-secondary'
                }
              >
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-muted">
            Full/Empty lock the quantity. Partial and Damaged let you edit it.
          </p>
        </div>

        <div className="card p-3">
          <label className="label block mb-1">Returned Qty (gal)</label>
          <input
            className="input text-lg font-bold"
            type="number"
            inputMode="numeric"
            min={0}
            max={TOTE_CAPACITY_GAL}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            disabled={condition === 'full' || condition === 'empty'}
          />
          <p className="mt-1 text-xs text-ink-muted">
            Saves as{' '}
            <span className="font-semibold text-ink">
              {condition === 'damaged' ? 'Hold' : condition === 'empty' ? 'Empty' : 'In Yard'}
            </span>{' '}
            with {condition === 'full' ? TOTE_CAPACITY_GAL : condition === 'empty' ? 0 : qty || 0} gal.
          </p>
        </div>

        <div className="card p-3">
          <label className="label block mb-1">Note (optional)</label>
          <textarea
            className="input min-h-[64px] py-2"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <button className="btn-primary w-full" disabled={saving} onClick={save}>
          {saving ? 'Saving…' : 'Save Return'}
        </button>
      </div>
    </Layout>
  );
}
