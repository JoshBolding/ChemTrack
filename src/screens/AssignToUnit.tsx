import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { getTote, listJobs, listUnits } from '../db/repo';
import type { Job, Tote, Unit } from '../types';
import { writeEvent } from '../lib/events';

export default function AssignToUnit() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const [tote, setTote] = useState<Tote | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [unitId, setUnitId] = useState('');
  const [jobId, setJobId] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const [t, us, js] = await Promise.all([
        getTote(id),
        listUnits(true),
        listJobs(true),
      ]);
      setTote(t ?? null);
      setUnits(us);
      setJobs(js);
    })();
  }, [id]);

  async function save() {
    if (!tote || !unitId) return;
    setSaving(true);
    await writeEvent({
      tote,
      type: 'assigned_to_unit',
      payload: { unitId, jobId: jobId || null, note },
      createdBy: 'jacob',
      toteUpdates: {
        status: 'assigned_to_unit',
        location: { kind: 'unit', unitId },
        jobId: jobId || undefined,
      },
      updatedLabel: 'Assigned to unit',
    });
    nav(`/tote/${encodeURIComponent(tote.id)}`);
  }

  if (!tote) return <Layout title="Loading…" back={`/tote/${id}`}><div /></Layout>;

  return (
    <Layout title="Assign to Unit" back={`/tote/${encodeURIComponent(tote.id)}`}>
      <div className="space-y-4">
        <div className="card p-4">
          <div className="label">Tote</div>
          <div className="text-lg font-bold">{tote.id}</div>
          <div className="text-ink-soft text-sm">
            {tote.currentQtyGal} gal
          </div>
        </div>

        <div className="card p-4 space-y-4">
          <div>
            <label className="label block mb-2">Unit</label>
            <select
              className="select"
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
            >
              <option value="">Select a unit…</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                  {u.region ? ` — ${u.region}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label block mb-2">Job (optional)</label>
            <select
              className="select"
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
            >
              <option value="">No job context</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.name} — {j.customer}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label block mb-2">Note (optional)</label>
            <textarea
              className="input min-h-[80px] py-3"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Anything worth remembering…"
            />
          </div>
        </div>

        <button
          className="btn-primary w-full"
          disabled={!unitId || saving}
          onClick={save}
        >
          {saving ? 'Saving…' : 'Save & Assign'}
        </button>
      </div>
    </Layout>
  );
}
