import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { getTote, listJobs } from '../db/repo';
import { currentActorId } from '../db/auth';
import type { Job, Tote } from '../types';
import { writeEvent } from '../lib/events';

export default function ChangeJob() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const state = useLocation().state;
  const [tote, setTote] = useState<Tote | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobId, setJobId] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const t = await getTote(id);
      setTote(t ?? null);
      setJobId(t?.jobId ?? '');
      setJobs(await listJobs(true));
    })();
  }, [id]);

  async function save() {
    if (!tote) return;
    setSaving(true);
    await writeEvent({
      tote,
      type: 'job_context_changed',
      payload: { jobId: jobId || null, note },
      createdBy: currentActorId(),
      toteUpdates: { jobId: jobId || undefined },
      updatedLabel: 'Job changed',
    });
    nav(`/tote/${encodeURIComponent(tote.id)}`, { state });
  }

  if (!tote) return <Layout title="Loading…" back={`/tote/${id}`} backState={state}><div /></Layout>;

  return (
    <Layout title="Change Job" back={`/tote/${encodeURIComponent(tote.id)}`} backState={state}>
      <div className="space-y-3">
        <div className="card p-3">
          <div className="label">Tote</div>
          <div className="text-sm font-semibold">{tote.id}</div>
        </div>
        <div className="card p-3">
          <label className="label block mb-1">Active Job</label>
          <select className="select" value={jobId} onChange={(e) => setJobId(e.target.value)}>
            <option value="">No job context</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>{j.name} — {j.customer}</option>
            ))}
          </select>
        </div>
        <div className="card p-3">
          <label className="label block mb-1">Note (optional)</label>
          <textarea className="input min-h-[64px] py-2" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <button className="btn-primary w-full" disabled={saving} onClick={save}>
          {saving ? 'Saving…' : 'Save Job Change'}
        </button>
      </div>
    </Layout>
  );
}
