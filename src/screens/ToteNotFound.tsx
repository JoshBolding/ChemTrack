import { Link, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';

export default function ToteNotFound() {
  const [params] = useSearchParams();
  const id = params.get('id') ?? '';
  return (
    <Layout title="Tote Not Found" back="/scan">
      <div className="card p-6 text-center space-y-4">
        <div>
          <div className="text-xl font-bold mb-1">Tote not recognized</div>
          <div className="text-sm text-ink-muted">
            {id ? (
              <>
                <span className="font-mono">{id}</span> isn't in the local
                snapshot.
              </>
            ) : (
              'No tote ID provided.'
            )}
          </div>
        </div>
        <div className="text-xs text-ink-muted">
          Possible causes: tote was received while you were offline, label
          was misread, or it hasn't been created yet.
        </div>
        <div className="grid gap-2">
          <Link to="/scan" className="btn-primary">
            Scan Again
          </Link>
          <Link to="/search" className="btn-secondary">
            Search Totes
          </Link>
          <Link to="/receive" className="btn-secondary">
            Receive New Totes
          </Link>
        </div>
      </div>
    </Layout>
  );
}
