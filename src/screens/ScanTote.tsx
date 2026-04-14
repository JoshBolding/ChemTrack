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
          {
            fps: 10,
            qrbox: { width: 260, height: 260 },
            aspectRatio: 1,
          },
          async (decodedText) => {
            if (!mounted) return;
            await handleResolved(decodedText.trim());
          },
          () => {
            // no-op on per-frame errors — too noisy
          }
        );
        if (mounted) setScanning(true);
      } catch (err) {
        if (!mounted) return;
        setCameraError(
          err instanceof Error ? err.message : 'Camera unavailable'
        );
      }
    }

    void start();

    return () => {
      mounted = false;
      const scanner = scannerRef.current;
      if (scanner && scanner.isScanning) {
        scanner.stop().catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleResolved(id: string) {
    // Stop scanning immediately so we don't fire multiple navigations.
    const scanner = scannerRef.current;
    if (scanner && scanner.isScanning) {
      await scanner.stop().catch(() => {});
    }
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
      <div className="space-y-4">
        <div className="card overflow-hidden">
          <div className="bg-black aspect-square relative">
            <div id={containerId} className="w-full h-full" />
            {!scanning && !cameraError && (
              <div className="absolute inset-0 flex items-center justify-center text-white/70 text-sm">
                Starting camera…
              </div>
            )}
            {cameraError && (
              <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-white/90">
                <div>
                  <div className="text-lg font-semibold mb-2">
                    Camera unavailable
                  </div>
                  <div className="text-sm opacity-80">{cameraError}</div>
                  <div className="text-xs opacity-60 mt-2">
                    Use manual entry below.
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="p-3 text-center text-sm text-ink-muted">
            Point your camera at the tote's QR label
          </div>
        </div>

        <div className="card p-4">
          <div className="label mb-2">Manual Entry</div>
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
            <button className="btn-primary" type="submit">
              Go
            </button>
          </form>
          <p className="text-xs text-ink-muted mt-2">
            Having trouble scanning? Type the ID instead.
          </p>
        </div>
      </div>
    </Layout>
  );
}
