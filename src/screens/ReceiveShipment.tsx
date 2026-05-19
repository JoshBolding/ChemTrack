import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { listProducts, listTotes, putTote, appendEvent } from '../db/repo';
import type { Product, Tote } from '../types';
import { TOTE_CAPACITY_GAL } from '../types';
import { makeToteId, uuid } from '../lib/ids';
import { ClipboardList, QrCode } from 'lucide-react';

export default function ReceiveShipment() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState('');
  const [count, setCount] = useState('14');
  const [generated, setGenerated] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const selectedProduct = products.find((product) => product.id === productId);

  useEffect(() => {
    void (async () => {
      const ps = await listProducts();
      setProducts(ps);
      if (ps[0]) setProductId(ps[0].id);
    })();
  }, []);

  async function generate() {
    if (!productId) return;
    const n = Math.max(1, Math.min(100, Number(count) || 0));
    setSaving(true);

    // Find next sequence number across totes received today.
    const today = new Date();
    const allTotes = await listTotes();
    const existingIds = new Set(allTotes.map((t) => t.id));
    let seq = 1;
    while (existingIds.has(makeToteId(seq, today))) seq++;

    const created: string[] = [];
    const nowIso = today.toISOString();
    for (let i = 0; i < n; i++) {
      let id = makeToteId(seq + i, today);
      while (existingIds.has(id)) {
        seq++;
        id = makeToteId(seq + i, today);
      }
      existingIds.add(id);

      const tote: Tote = {
        id,
        productId,
        status: 'in_yard',
        location: { kind: 'yard' },
        currentQtyGal: TOTE_CAPACITY_GAL,
        receivedAt: nowIso,
        createdBy: 'operator',
        syncState: 'synced',
        updatedAt: nowIso,
        updatedBy: 'operator',
        updatedLabel: 'Received',
      };
      await putTote(tote);
      await appendEvent({
        id: uuid(),
        toteId: id,
        type: 'received',
        createdAt: nowIso,
        createdBy: 'operator',
        payload: { productId, qty: TOTE_CAPACITY_GAL },
        synced: true,
      });
      created.push(id);
    }

    setGenerated(created);
    setSaving(false);
  }

  return (
    <Layout title="Receive Shipment" back="/">
      <div className="space-y-4">
        <div className="card p-4 space-y-4">
          <div>
            <label className="label block mb-2">Product</label>
            <select
              className="select"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label block mb-2">Number of Totes</label>
            <input
              className="input text-2xl font-bold"
              type="number"
              inputMode="numeric"
              min={1}
              max={100}
              value={count}
              onChange={(e) => setCount(e.target.value)}
            />
            <p className="text-xs text-ink-muted mt-1">
              Each tote will be created with {TOTE_CAPACITY_GAL} gallons.
            </p>
          </div>
        </div>
        <button
          className="btn-primary w-full"
          disabled={saving}
          onClick={generate}
        >
          <ClipboardList size={18} />
          {saving ? 'Generating...' : 'Generate Tote Records'}
        </button>

        {generated.length > 0 && (
          <div className="space-y-4">
            <div className="panel p-4">
              <div className="label mb-3">Created {generated.length} totes</div>
              <div className="flex flex-wrap gap-1">
                {generated.map((id) => (
                  <span
                    key={id}
                    className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 font-mono text-[11px] text-emerald-800"
                  >
                    {id}
                  </span>
                ))}
              </div>
            </div>

            <div className="panel p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="label text-primary">Label Preview</div>
                  <div className="mt-1 text-sm text-ink-muted">
                    Print-style QR value for the first created tote.
                  </div>
                </div>
                <QrCode size={24} className="text-primary" />
              </div>
              <div className="rounded-lg border-2 border-dashed border-slate-300 bg-white p-4">
                <div className="flex items-center gap-4">
                  <div className="grid h-20 w-20 shrink-0 grid-cols-4 gap-1 rounded bg-chrome p-2">
                    {Array.from({ length: 16 }).map((_, index) => (
                      <span
                        key={index}
                        className={`rounded-sm ${index % 2 === 0 || index === 7 ? 'bg-white' : 'bg-primary'}`}
                      />
                    ))}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-extrabold uppercase tracking-wide text-ink-muted">
                      ChemTrack
                    </div>
                    <div className="mt-1 truncate font-mono text-xl font-extrabold">
                      {generated[0]}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-ink-soft">
                      {selectedProduct?.name ?? productId}
                    </div>
                    <div className="text-xs text-ink-muted">
                      {TOTE_CAPACITY_GAL} gal received into yard.
                    </div>
                  </div>
                </div>
              </div>
              <Link
                to={`/tote/${encodeURIComponent(generated[0])}`}
                className="btn-secondary mt-3 w-full"
              >
                Open First New Tote
              </Link>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
