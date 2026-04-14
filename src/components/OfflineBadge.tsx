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
        className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full bg-white/10"
        title="Online and synced"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-300" />
        Online
      </span>
    );
  }
  if (online && pending > 0) {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full bg-yellow-400/20 text-yellow-100"
        title={`${pending} changes pending sync`}
      >
        <span className="w-2 h-2 rounded-full bg-yellow-300" />
        {pending} pending
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full bg-red-500/30 text-red-100"
      title="Offline — changes will sync when reconnected"
    >
      <span className="w-2 h-2 rounded-full bg-red-300" />
      Offline
    </span>
  );
}
