import { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import { listProducts, listTotes, putTote, appendEvent } from '../db/repo';
import type { Product, Tote, ToteCondition } from '../types';
import { TOTE_CONDITION_LABELS } from '../types';
import { makeToteId, uuid } from '../lib/ids';

interface RowOverride {
  qty: number;
  capacity: number;
}

export default function ReceiveShipment() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState('');
  const [count, setCount] = useState('14');
  const [capacityGal, setCapacityGal] = useState('330');
  const [vendor, setVendor] = useState('');
  const [vendorBol, setVendorBol] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [tareWeightLb, setTareWeightLb] = useState('');
  const [condition, setCondition] = useState<ToteCondition>('good');
  const [overrides, setOverrides] = useState<Record<number, RowOverride>>({});
  const [generated, setGenerated] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const ps = await listProducts();
      setProducts(ps);
      if (ps[0]) {
        setProductId(ps[0].id);
        setCapacityGal(String(ps[0].defaultToteCapacityGal));
      }
    })();
  }, []);

  const product = useMemo(
    () => products.find((p) => p.id === productId),
    [products, productId],
  );

  function onProductChange(id: string) {
    setProductId(id);
    const p = products.find((x) => x.id === id);
    if (p) setCapacityGal(String(p.defaultToteCapacityGal));
    setOverrides({});
  }

  const n = Math.max(1, Math.min(100, Number(count) || 0));
  const capNum = Math.max(1, Number(capacityGal) || 0);

  const totalGal = useMemo(() => {
    let total = 0;
    for (let i = 0; i < n; i++) {
      const o = overrides[i];
      total += o ? o.qty : capNum;
    }
    return total;
  }, [n, capNum, overrides]);

  const totalLb = product
    ? Math.round(totalGal * product.densityLbPerGal)
    : null;

  function setRowQty(i: number, qty: number) {
    setOverrides((prev) => {
      const next = { ...prev };
      const clamped = Math.max(0, Math.min(capNum, qty));
      if (clamped === capNum) {
        delete next[i];
      } else {
        next[i] = { qty: clamped, capacity: capNum };
      }
      return next;
    });
  }

  async function generate() {
    if (!productId) return;
    setSaving(true);

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

      const o = overrides[i];
      const qty = o ? o.qty : capNum;
      const initialStatus = condition === 'good' ? 'in_yard' : 'hold';

      const tote: Tote = {
        id,
        productId,
        status: initialStatus,
        location: { kind: condition === 'good' ? 'yard' : 'hold' },
        capacityGal: capNum,
        currentQtyGal: qty,
        lotNumber: lotNumber.trim() || undefined,
        expiresAt: expiresAt || undefined,
        vendor: vendor.trim() || undefined,
        vendorBol: vendorBol.trim() || undefined,
        tareWeightLb: tareWeightLb ? Number(tareWeightLb) : undefined,
        conditionOnArrival: condition,
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
        payload: {
          productId,
          qty,
          capacityGal: capNum,
          lotNumber: tote.lotNumber,
          vendor: tote.vendor,
          vendorBol: tote.vendorBol,
          condition,
        },
        synced: true,
      });
      created.push(id);
    }
    setGenerated(created);
    setSaving(false);
  }

  return (
    <Layout title="Receive Shipment" back="/">
      <div className="space-y-3">
        <div className="card p-3 space-y-3">
          <div>
            <label className="label block mb-1">Product</label>
            <select
              className="select"
              value={productId}
              onChange={(e) => onProductChange(e.target.value)}
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {product && (
              <div className="text-[11px] text-ink-muted mt-1">
                {product.densityLbPerGal} lb/gal
                {product.manufacturer && <> · {product.manufacturer}</>}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label block mb-1">Tote count</label>
              <input
                className="input text-base font-bold"
                type="number"
                inputMode="numeric"
                min={1}
                max={100}
                value={count}
                onChange={(e) => setCount(e.target.value)}
              />
            </div>
            <div>
              <label className="label block mb-1">Capacity (gal)</label>
              <input
                className="input text-base font-bold"
                type="number"
                inputMode="numeric"
                min={1}
                value={capacityGal}
                onChange={(e) => {
                  setCapacityGal(e.target.value);
                  setOverrides({});
                }}
              />
            </div>
          </div>
        </div>

        <div className="card p-3 space-y-3">
          <div className="label">Shipment</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label block mb-1">Vendor</label>
              <input
                className="input"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                placeholder="Multi-Chem"
              />
            </div>
            <div>
              <label className="label block mb-1">BOL / PO</label>
              <input
                className="input font-mono"
                value={vendorBol}
                onChange={(e) => setVendorBol(e.target.value)}
                placeholder="BOL-44217"
              />
            </div>
            <div>
              <label className="label block mb-1">Lot #</label>
              <input
                className="input font-mono"
                value={lotNumber}
                onChange={(e) => setLotNumber(e.target.value)}
                placeholder="MC-26-0412"
              />
            </div>
            <div>
              <label className="label block mb-1">Expires</label>
              <input
                className="input"
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
            <div>
              <label className="label block mb-1">Tare wt (lb)</label>
              <input
                className="input"
                type="number"
                inputMode="numeric"
                min={0}
                value={tareWeightLb}
                onChange={(e) => setTareWeightLb(e.target.value)}
                placeholder="145"
              />
            </div>
            <div>
              <label className="label block mb-1">Condition</label>
              <select
                className="select"
                value={condition}
                onChange={(e) => setCondition(e.target.value as ToteCondition)}
              >
                {(Object.keys(TOTE_CONDITION_LABELS) as ToteCondition[]).map(
                  (c) => (
                    <option key={c} value={c}>
                      {TOTE_CONDITION_LABELS[c]}
                    </option>
                  ),
                )}
              </select>
            </div>
          </div>
        </div>

        <div className="card p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="label">Per-tote fill</span>
            {Object.keys(overrides).length > 0 && (
              <button
                type="button"
                className="text-[11px] text-ink-muted underline"
                onClick={() => setOverrides({})}
              >
                Reset all to full
              </button>
            )}
          </div>
          <p className="text-[11px] text-ink-muted mb-2">
            Defaults to {capNum} gal each. Edit a row to record a partial fill.
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {Array.from({ length: n }).map((_, i) => {
              const o = overrides[i];
              const isPartial = !!o;
              return (
                <div
                  key={i}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded border text-xs ${
                    isPartial
                      ? 'border-amber-300 bg-amber-50'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <span className="text-ink-muted text-[11px] w-5">
                    #{i + 1}
                  </span>
                  <input
                    className="flex-1 min-w-0 bg-transparent outline-none font-medium tabular-nums"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={capNum}
                    value={o ? o.qty : capNum}
                    onChange={(e) => setRowQty(i, Number(e.target.value))}
                  />
                  <span className="text-ink-muted text-[11px]">gal</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card p-3">
          <div className="flex items-baseline justify-between">
            <span className="label">Total</span>
            <div className="text-right">
              <div className="text-base font-bold tabular-nums">
                {totalGal.toLocaleString()}
                <span className="text-xs text-ink-muted font-normal"> gal</span>
              </div>
              {totalLb !== null && (
                <div className="text-[11px] text-ink-muted">
                  {totalLb.toLocaleString()} lb net
                </div>
              )}
            </div>
          </div>
        </div>

        <button
          className="btn-primary w-full"
          disabled={saving || !productId}
          onClick={generate}
        >
          {saving ? 'Generating…' : `Receive ${n} tote${n === 1 ? '' : 's'}`}
        </button>

        {generated.length > 0 && (
          <div className="card p-3">
            <div className="label mb-2">Created {generated.length} totes</div>
            <div className="flex flex-wrap gap-1">
              {generated.map((id) => (
                <span
                  key={id}
                  className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800"
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
