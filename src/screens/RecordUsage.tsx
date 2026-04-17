import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { getTote, getUnit, listJobs } from '../db/repo';
import type { Job, Tote, Unit } from '../types';
import { TOTE_CAPACITY_GAL } from '../types';
import { writeEvent } from '../lib/events';

type Mode = 'remaining' | 'used';

export default function RecordUsage() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const [tote, setTote] = useState<Tote | null>(null);
  const [unit, setUnit] = useState<Unit | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [mode, setMode] = useState<Mode>('remaining');
  const [value, setValue] = useState('');
  const [jobId, setJobId] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const t = await getTote(id);
      setTote(t ?? null);
      if (!t) return;
      if (t.location.kind === 'unit' && t.location.unitId) {
        setUnit((await getUnit(t.location.unitId)) ?? null);
      }
      setJobs(await listJobs(true));
      setJobId(t.jobId ?? '');
      setValue(String(t.currentQtyGal));
    })();
  }, [id]);

  const newQty = useMemo(() => {
    if (!tote) return 0;
    const n = Number(value);
    if (Number.isNaN(n)) return tote.currentQtyGal;
    return mode === 'remaining' ? n : Math.max(0, tote.currentQtyGal - n);
  }, [mode, value, tote]);

  const usedDelta = useMemo(() => {
    if (!tote) return 0;
    return Math.max(0, tote.currentQtyGal - newQty);
  }, [tote, newQty]);

  async function save() {
    if (!tote) return;
    if (newQty < 0 || newQty > TOTE_CAPACITY_GAL) return;
    setSaving(true);
    const markEmpty = newQty === 0;
    await writeEvent({
      tote,
      type: 'usage_recorded',
      payload: {
        mode,
        newQtyGal: newQty,
        usedDeltaGal: usedDelta,
        jobId: jobId || null,
        note,
      },
      createdBy: 'jacob',
      toteUpdates: {
        currentQtyGal: newQty,
        status: markEmpty ? 'empty' : tote.status,
        jobId: jobId || undefined,
      },
      updatedLabel: 'Usage recorded',
    });
    nav(`/tote/${encodeURIComponent(tote.id)}`);
  }

  if (!tote) return <Layout title="Loading…" back={`/tote/${id}`}><div /></Layout>;

  return (
    <Layout title="Record Usage" back={`/tote/${encodeURIComponent(tote.id)}`}>
      <div className="space-y-3">
        <div className="card p-3">
          <div className="label">Tote</div>
          <div className="text-sm font-semibold">{tote.id}</div>
          <div className="text-xs text-ink-muted">
            {unit ? `On ${unit.name}` : 'Location: —'} · {tote.currentQtyGal} gal
          </div>
        </div>

        <div className="card p-3">
          <div className="label mb-1">Entry Method</div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button
              onClick={() => setMode('remaining')}
              className={mode === 'remaining' ? 'btn-primary' : 'btn-secondary'}
              type="button"
            >
              Remaining
            </button>
            <button
              onClick={() => setMode('used')}
              className={mode === 'used' ? 'btn-primary' : 'btn-secondary'}
              type="button"
            >
              Used
            </button>
          </div>

          <label className="label block mb-1">
            {mode === 'remaining' ? 'Gallons Remaining' : 'Gallons Used'}
          </label>
          <input
            className="input text-lg font-bold"
            type="number"
            inputMode="numeric"
            min={0}
            max={TOTE_CAPACITY_GAL}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />

          <div className="mt-2 text-xs text-ink-muted">
            New qty:{' '}
            <span className="font-semibold text-ink">{newQty} gal</span>
            {usedDelta > 0 && (
              <> · Used: <span className="font-semibold text-ink">{usedDelta} gal</span></>
            )}
          </div>
        </div>

        <div className="card p-3 space-y-3">
          <div>
            <label className="label block mb-1">Attribute to Job</label>
            <select
              className="select"
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
            >
              <option value="">No job</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label block mb-1">Note (optional)</label>
            <textarea
              className="input min-h-[64px] py-2"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        <button className="btn-primary w-full" disabled={saving} onClick={save}>
          {saving ? 'Saving…' : newQty === 0 ? 'Save & Mark Empty' : 'Save Update'}
        </button>
      </div>
    </Layout>
  );
}
