import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { getTote, getUnit, listJobs } from '../db/repo';
import type { Job, Tote, Unit } from '../types';
import { TOTE_CAPACITY_GAL } from '../types';
import { writeEvent } from '../lib/events';
import { Briefcase, Minus, Plus } from 'lucide-react';

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
  const invalid = newQty < 0 || newQty > TOTE_CAPACITY_GAL || !jobId;

  async function save() {
    if (!tote) return;
    if (invalid) return;
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
      createdBy: 'operator',
      toteUpdates: {
        currentQtyGal: newQty,
        status: markEmpty ? 'empty' : tote.status,
        jobId: jobId || undefined,
      },
      updatedLabel: 'Usage recorded',
    });
    nav(`/tote/${encodeURIComponent(tote.id)}`);
  }

  if (!tote) return <Layout title="Loading..." back={`/tote/${id}`}><div /></Layout>;

  function step(delta: number) {
    const current = Number(value) || 0;
    const next = Math.max(0, Math.min(TOTE_CAPACITY_GAL, current + delta));
    setValue(String(next));
  }

  return (
    <Layout title="Record Usage" back={`/tote/${encodeURIComponent(tote.id)}`}>
      <div className="space-y-4">
        <section className="panel p-4">
          <div className="font-mono text-2xl font-extrabold">{tote.id}</div>
          <div className="mt-1 text-sm text-ink-soft">
            {unit ? `On ${unit.name}` : 'Location: —'} • Currently{' '}
            <span className="font-semibold text-ink">
              {tote.currentQtyGal} gal
            </span>
          </div>
        </section>

        <section className="panel p-4">
          <div className="label mb-2">Entry Method</div>
          <div className="mb-5 grid grid-cols-2 overflow-hidden rounded-lg border border-slate-300">
            <button
              onClick={() => setMode('remaining')}
              className={`min-h-[56px] text-sm font-extrabold uppercase tracking-wide ${
                mode === 'remaining'
                  ? 'bg-primary text-white'
                  : 'bg-white text-ink'
              }`}
              type="button"
            >
              Remaining
            </button>
            <button
              onClick={() => setMode('used')}
              className={`min-h-[56px] border-l border-slate-300 text-sm font-extrabold uppercase tracking-wide ${
                mode === 'used' ? 'bg-primary text-white' : 'bg-white text-ink'
              }`}
              type="button"
            >
              Used
            </button>
          </div>

          <label className="mb-2 block text-sm text-ink-soft">
            {mode === 'remaining' ? 'Gallons Remaining' : 'Gallons Used'}
          </label>
          <div className="grid grid-cols-[56px_1fr_56px] items-center gap-3">
            <button type="button" className="btn-secondary min-h-[56px] px-0" onClick={() => step(-10)}>
              <Minus size={22} />
            </button>
            <div className="flex items-baseline justify-center gap-2 border-b border-slate-200 pb-2">
              <input
                className="w-32 bg-transparent text-center text-6xl font-extrabold tracking-tight outline-none"
                type="number"
                inputMode="numeric"
                min={0}
                max={TOTE_CAPACITY_GAL}
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
              <span className="text-xl font-semibold">gal</span>
            </div>
            <button type="button" className="btn-secondary min-h-[56px] px-0" onClick={() => step(10)}>
              <Plus size={22} />
            </button>
          </div>

          <div className="mt-3 text-center text-sm text-ink-muted">
            0 - {TOTE_CAPACITY_GAL} gal
            {usedDelta > 0 && (
              <>
                {' '}· Used this entry:{' '}
                <span className="font-bold text-ink">{usedDelta} gal</span>
              </>
            )}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {[280, 210, 0].map((preset) => (
              <button
                key={preset}
                type="button"
                className="min-h-[48px] rounded-lg border border-slate-300 bg-white px-2 text-sm font-extrabold active:bg-surface-sunken"
                onClick={() => {
                  setMode('remaining');
                  setValue(String(preset));
                }}
              >
                {preset} gal
              </button>
            ))}
          </div>
        </section>

        <section className="panel p-4">
          <div className="label mb-2">New Quantity</div>
          <div className="flex items-end justify-between">
            <div>
              <span className="text-3xl font-extrabold">{newQty}</span>
              <span className="ml-1 text-lg font-semibold text-ink-soft">
                / {TOTE_CAPACITY_GAL} gal
              </span>
            </div>
            <div className="text-sm font-bold text-ink-muted">
              {Math.round((newQty / TOTE_CAPACITY_GAL) * 100)}%
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-sunken">
            <div
              className="h-full rounded-full bg-field-amber"
              style={{ width: `${Math.min(100, Math.max(0, (newQty / TOTE_CAPACITY_GAL) * 100))}%` }}
            />
          </div>
        </section>

        <section className="panel p-4 space-y-4">
          <div>
            <label className="label mb-2 flex items-center gap-2">
              <Briefcase size={15} />
              Job (required)
            </label>
            <select
              className="select"
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
            >
              <option value="">Select job</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-ink-muted mt-1">
              Defaults to tote's current job. Override if used across jobs.
            </p>
          </div>
          <div>
            <label className="label block mb-2">Note (optional)</label>
            <textarea
              className="input min-h-[80px] py-3"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </section>

        <button
          className="btn-primary w-full"
          disabled={saving || invalid}
          onClick={save}
        >
          {saving
            ? 'Saving...'
            : newQty === 0
              ? 'Save & Mark Empty'
              : 'Save Update'}
        </button>
        <button type="button" className="btn-quiet w-full" onClick={() => nav(`/tote/${encodeURIComponent(tote.id)}`)}>
          Cancel
        </button>
      </div>
    </Layout>
  );
}
