// Simple ID helpers for V1. Tote IDs follow the RH-YYMMDD-NNN convention.

export function todayStamp(d = new Date()): string {
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}${mm}${dd}`;
}

export function makeToteId(seq: number, date?: Date): string {
  return `RH-${todayStamp(date)}-${String(seq).padStart(3, '0')}`;
}

export function uuid(): string {
  // Good enough for POC. crypto.randomUUID works on all modern browsers & Node.
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}
