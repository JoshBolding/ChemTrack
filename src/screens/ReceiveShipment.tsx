import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { listProducts, listTotes, putTote, appendEvent } from '../db/repo';
import type { Product, Tote } from '../types';
import { TOTE_CAPACITY_GAL } from '../types';
import { makeToteId, uuid } from '../lib/ids';

export default function ReceiveShipment() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState('');
  const [count, setCount] = useState('14');
  const [generated, setGenerated] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

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
        createdBy: 'jacob',
        syncState: 'synced',
        updatedAt: nowIso,
        updatedBy: 'jacob',
        updatedLabel: 'Received',
      };
      await putTote(tote);
      await appendEvent({
        id: uuid(),
        toteId: id,
        type: 'received',
        createdAt: nowIso,
        createdBy: 'jacob',
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
          {saving ? 'Generating…' : 'Generate Tote Records'}
        </button>

        {generated.length > 0 && (
          <div className="card p-4">
            <div className="label mb-3">Created {generated.length} totes</div>
            <div className="flex flex-wrap gap-1">
              {generated.map((id) => (
                <span
                  key={id}
                  className="text-[11px] font-mono px-2 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800"
                >
                  {id}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
