import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { listJobs, listTotes } from '../db/repo';
import type { Job, Tote } from '../types';

export default function Jobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [totes, setTotes] = useState<Tote[]>([]);

  useEffect(() => {
    void (async () => {
      setJobs(await listJobs());
      setTotes(await listTotes());
    })();
  }, []);

  return (
    <Layout title="Jobs" back="/">
      <div className="card divide-y divide-slate-100">
        {jobs.map((j) => {
          const ts = totes.filter((t) => t.jobId === j.id);
          const gal = ts.reduce((n, t) => n + t.currentQtyGal, 0);
          return (
            <div
              key={j.id}
              className={`px-3 py-2.5 ${!j.active ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">
                    {j.name}
                    {!j.active && <span className="ml-1 text-xs text-ink-muted">(inactive)</span>}
                  </div>
                  <div className="text-xs text-ink-muted">
                    {j.customer}{j.region ? ` · ${j.region}` : ''}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold">
                    {gal.toLocaleString()} <span className="text-xs text-ink-muted font-normal">gal</span>
                  </div>
                  <div className="text-xs text-ink-muted">
                    {ts.length} tote{ts.length === 1 ? '' : 's'}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {jobs.length === 0 && (
          <div className="px-3 py-4 text-xs text-ink-muted text-center">No jobs yet.</div>
        )}
      </div>
    </Layout>
  );
}
