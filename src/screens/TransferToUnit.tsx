import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { getTote, getUnit, listUnits } from '../db/repo';
import type { Tote, Unit } from '../types';
import { writeEvent } from '../lib/events';

export default function TransferToUnit() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const [tote, setTote] = useState<Tote | null>(null);
  const [fromUnit, setFromUnit] = useState<Unit | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [toUnitId, setToUnitId] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const t = await getTote(id);
      setTote(t ?? null);
      if (!t) return;
      if (t.status !== 'assigned_to_unit' || t.location.kind !== 'unit') {
        setLoadError('Only totes assigned to a unit can be transferred.');
        return;
      }
      const [us, src] = await Promise.all([
        listUnits(true),
        t.location.unitId ? getUnit(t.location.unitId) : Promise.resolve(undefined),
      ]);
      setUnits(us);
      setFromUnit(src ?? null);
    })();
  }, [id]);

  async function save() {
    if (!tote || !toUnitId) return;
    if (tote.location.kind !== 'unit' || toUnitId === tote.location.unitId) return;
    setSaving(true);
    await writeEvent({
      tote,
      type: 'transferred',
      payload: { fromUnitId: tote.location.unitId, toUnitId, note },
      createdBy: 'jacob',
      toteUpdates: { location: { kind: 'unit', unitId: toUnitId } },
      updatedLabel: 'Transferred',
    });
    nav(`/tote/${encodeURIComponent(tote.id)}`);
  }

  if (!tote) return <Layout title="Loading…" back={`/tote/${id}`}><div /></Layout>;
  if (loadError) {
    return (
      <Layout title="Transfer" back={`/tote/${encodeURIComponent(tote.id)}`}>
        <div className="card p-3 text-sm text-ink-muted">{loadError}</div>
      </Layout>
    );
  }

  const destinations = units.filter((u) => u.id !== tote.location.unitId);

  return (
    <Layout title="Transfer to Unit" back={`/tote/${encodeURIComponent(tote.id)}`}>
      <div className="space-y-3">
        <div className="card p-3">
          <div className="label">Tote</div>
          <div className="text-sm font-semibold">{tote.id}</div>
          <div className="text-xs text-ink-muted">{tote.currentQtyGal} gal</div>
        </div>

        <div className="card p-3 space-y-3">
          <div>
            <div className="label">From</div>
            <div className="text-sm font-semibold">
              {fromUnit?.name ?? tote.location.unitId ?? 'Unknown'}
              {fromUnit?.region && (
                <span className="text-ink-muted font-normal"> — {fromUnit.region}</span>
              )}
            </div>
          </div>
          <div>
            <label className="label block mb-1">Destination Unit</label>
            <select className="select" value={toUnitId} onChange={(e) => setToUnitId(e.target.value)}>
              <option value="">Select a unit…</option>
              {destinations.map((u) => (
                <option key={u.id} value={u.id}>{u.name}{u.region ? ` — ${u.region}` : ''}</option>
              ))}
            </select>
            {destinations.length === 0 && (
              <div className="text-xs text-ink-muted mt-1">No other active units.</div>
            )}
          </div>
          <div>
            <label className="label block mb-1">Note (optional)</label>
            <textarea className="input min-h-[64px] py-2" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>

        <button className="btn-primary w-full" disabled={!toUnitId || saving} onClick={save}>
          {saving ? 'Saving…' : 'Save & Transfer'}
        </button>
      </div>
    </Layout>
  );
}
