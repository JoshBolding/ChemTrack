import { Link, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';

export default function ToteNotFound() {
  const [params] = useSearchParams();
  const id = params.get('id') ?? '';
  return (
    <Layout title="Not Found" back="/scan">
      <div className="card p-4 text-center space-y-3">
        <div>
          <div className="text-sm font-semibold mb-1">Tote not recognized</div>
          <div className="text-xs text-ink-muted">
            {id ? (
              <><span className="font-mono">{id}</span> isn't in the local snapshot.</>
            ) : 'No tote ID provided.'}
          </div>
        </div>
        <div className="text-xs text-ink-muted">
          Possible causes: received while offline, label misread, or not yet created.
        </div>
        <div className="grid gap-2">
          <Link to="/scan" className="btn-primary">Scan Again</Link>
          <Link to="/search" className="btn-secondary">Search Totes</Link>
          <Link to="/receive" className="btn-secondary">Receive New Totes</Link>
        </div>
      </div>
    </Layout>
  );
}
