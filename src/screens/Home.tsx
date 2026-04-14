import { Link } from 'react-router-dom';
import Layout from '../components/Layout';

const tiles: {
  to: string;
  label: string;
  sub: string;
  icon: string;
  tone: string;
}[] = [
  {
    to: '/scan',
    label: 'Scan Tote',
    sub: 'Most common action',
    icon: '⌖',
    tone: 'bg-primary text-white',
  },
  {
    to: '/receive',
    label: 'Receive Shipment',
    sub: 'Create new totes',
    icon: '⊞',
    tone: 'bg-white text-ink border border-slate-200',
  },
  {
    to: '/units',
    label: 'Units',
    sub: 'Mini-warehouses',
    icon: '⛟',
    tone: 'bg-white text-ink border border-slate-200',
  },
  {
    to: '/jobs',
    label: 'Jobs',
    sub: 'Active jobs',
    icon: '⚙',
    tone: 'bg-white text-ink border border-slate-200',
  },
  {
    to: '/inventory',
    label: 'Inventory',
    sub: 'Totals by product',
    icon: '≡',
    tone: 'bg-white text-ink border border-slate-200',
  },
  {
    to: '/search',
    label: 'Search Tote',
    sub: 'Manual lookup',
    icon: '⌕',
    tone: 'bg-white text-ink border border-slate-200',
  },
];

export default function Home() {
  return (
    <Layout title="ChemTrack">
      <div className="mb-4">
        <p className="text-ink-soft text-sm">
          Scan first, decide second. Tap a tote's QR code to act on it.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {tiles.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            className={`rounded-2xl p-4 min-h-[120px] flex flex-col justify-between shadow-sm active:scale-[0.98] transition ${t.tone}`}
          >
            <span className="text-3xl leading-none">{t.icon}</span>
            <div>
              <div className="text-lg font-bold leading-tight">{t.label}</div>
              <div className="text-xs opacity-80 mt-0.5">{t.sub}</div>
            </div>
          </Link>
        ))}
      </div>
    </Layout>
  );
}
