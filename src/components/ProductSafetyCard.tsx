import { FileText, ShieldCheck } from 'lucide-react';
import type { Product } from '../types';
import { getProductSafety } from '../lib/productSafety';

export default function ProductSafetyCard({ product }: { product?: Product | null }) {
  const safety = getProductSafety(product);

  return (
    <section className="panel p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="label text-primary">Safety Quick Card</div>
          <div className="mt-1 text-sm font-semibold text-ink">
            {product?.name ?? 'Product safety'}
          </div>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-primary">
          <ShieldCheck size={21} />
        </div>
      </div>

      <div className="grid gap-2 text-sm">
        <SafetyRow label="PPE" value={safety.ppe} />
        <SafetyRow label="Spill" value={safety.spill} />
        <SafetyRow label="First Aid" value={safety.firstAid} />
        <SafetyRow label="Handling" value={safety.handling} />
      </div>

      <div className="mt-3 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-3 text-sm font-extrabold uppercase tracking-wide text-ink">
        <FileText size={16} />
        SDS reference: {safety.sdsLabel}
      </div>
    </section>
  );
}

function SafetyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[76px_1fr] gap-2 rounded-lg bg-surface-sunken px-3 py-2">
      <div className="text-[11px] font-extrabold uppercase tracking-wide text-ink-muted">
        {label}
      </div>
      <div className="text-sm font-medium leading-snug text-ink-soft">{value}</div>
    </div>
  );
}
