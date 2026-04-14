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
      <div className="space-y-3">
        {jobs.map((j) => {
          const ts = totes.filter((t) => t.jobId === j.id);
          const gal = ts.reduce((n, t) => n + t.currentQtyGal, 0);
          return (
            <div
              key={j.id}
              className={`card p-4 ${!j.active ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-bold">
                    {j.name}
                    {!j.active && (
                      <span className="ml-2 text-xs font-semibold text-ink-muted">
                        (inactive)
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-ink-muted">
                    {j.customer}
                    {j.region ? ` • ${j.region}` : ''}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-extrabold text-primary">
                    {gal.toLocaleString()}{' '}
                    <span className="text-xs font-semibold text-ink-muted">
                      gal
                    </span>
                  </div>
                  <div className="text-xs text-ink-muted">
                    {ts.length} tote{ts.length === 1 ? '' : 's'}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Layout>
  );
}
