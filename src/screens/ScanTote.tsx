import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { getTote } from '../db/repo';
import { Html5Qrcode } from 'html5-qrcode';

export default function ScanTote() {
  const navigate = useNavigate();
  const [manualId, setManualId] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'qr-scanner';

  useEffect(() => {
    let mounted = true;
    async function start() {
      try {
        const scanner = new Html5Qrcode(containerId);
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 260, height: 260 }, aspectRatio: 1 },
          async (decodedText) => {
            if (!mounted) return;
            await handleResolved(decodedText.trim());
          },
          () => {},
        );
        if (mounted) setScanning(true);
      } catch (err) {
        if (!mounted) return;
        setCameraError(err instanceof Error ? err.message : 'Camera unavailable');
      }
    }
    void start();
    return () => {
      mounted = false;
      const scanner = scannerRef.current;
      if (scanner && scanner.isScanning) scanner.stop().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleResolved(id: string) {
    const scanner = scannerRef.current;
    if (scanner && scanner.isScanning) await scanner.stop().catch(() => {});
    const existing = await getTote(id);
    if (existing) {
      navigate(`/tote/${encodeURIComponent(id)}`);
    } else {
      navigate(`/tote/not-found?id=${encodeURIComponent(id)}`);
    }
  }

  function submitManual(e: React.FormEvent) {
    e.preventDefault();
    const v = manualId.trim();
    if (!v) return;
    void handleResolved(v);
  }

  return (
    <Layout title="Scan Tote" back="/">
      <div className="space-y-3">
        <div className="card overflow-hidden">
          <div className="bg-black aspect-square relative">
            <div id={containerId} className="w-full h-full" />
            {!scanning && !cameraError && (
              <div className="absolute inset-0 flex items-center justify-center text-white/70 text-sm">
                Starting camera…
              </div>
            )}
            {cameraError && (
              <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-white/90">
                <div>
                  <div className="text-sm font-semibold mb-1">Camera unavailable</div>
                  <div className="text-xs opacity-80">{cameraError}</div>
                </div>
              </div>
            )}
          </div>
          <div className="p-2 text-center text-xs text-ink-muted">
            Point camera at the tote's QR label
          </div>
        </div>

        <div className="card p-3">
          <div className="label mb-1">Manual Entry</div>
          <form onSubmit={submitManual} className="flex gap-2">
            <input
              className="input flex-1"
              placeholder="RH-250414-007"
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
            />
            <button className="btn-primary" type="submit">Go</button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
