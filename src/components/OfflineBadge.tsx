import { useEffect, useState } from 'react';
import { countPendingEvents } from '../db/repo';

// Persistent header badge showing connectivity + pending-sync count.
export default function OfflineBadge() {
  const [online, setOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [pending, setPending] = useState(0);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const tick = async () => {
      const n = await countPendingEvents();
      if (mounted) setPending(n);
    };
    tick();
    const id = setInterval(tick, 3000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  if (online && pending === 0) {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-xs font-medium text-emerald-100"
        title="Connected. This build stores data locally on the device."
      >
        <span className="w-2 h-2 rounded-full bg-emerald-300" />
        Online
      </span>
    );
  }
  if (online && pending > 0) {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full border border-yellow-300/20 bg-yellow-300/10 px-2.5 py-1 text-xs font-medium text-yellow-100"
        title={`${pending} offline change${pending === 1 ? '' : 's'} saved locally and still queued`}
      >
        <span className="w-2 h-2 rounded-full bg-yellow-300" />
        {pending} queued
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-red-300/20 bg-red-400/12 px-2.5 py-1 text-xs font-medium text-red-100"
      title="Offline. Changes are still saved locally on this device."
    >
      <span className="w-2 h-2 rounded-full bg-red-300" />
      Offline
    </span>
  );
}
