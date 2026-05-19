import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTote } from '../db/repo';
import type { Html5Qrcode } from 'html5-qrcode';
import { Camera, Keyboard, Menu, QrCode, Search, ScanLine, X } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import ChemTrackMark from '../components/ChemTrackMark';
import OfflineBadge from '../components/OfflineBadge';

export default function ScanTote() {
  const navigate = useNavigate();
  const [manualId, setManualId] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const startRequestRef = useRef(0);
  const containerId = 'qr-scanner';

  useEffect(() => {
    return () => {
      const scanner = scannerRef.current;
      if (scanner && scanner.isScanning) {
        scanner.stop().catch(() => {});
      }
    };
  }, []);

  async function startCamera() {
    const requestId = startRequestRef.current + 1;
    startRequestRef.current = requestId;
    setCameraOpen(true);
    setCameraError(null);
    setScanning(false);
    try {
      await waitForScannerElement(containerId);
      if (startRequestRef.current !== requestId) return;
      const { Html5Qrcode } = await import('html5-qrcode');
      if (startRequestRef.current !== requestId) return;
      const scanner = scannerRef.current ?? new Html5Qrcode(containerId);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
        },
        async (decodedText) => {
          await handleResolved(decodedText.trim());
        },
        () => {
          // no-op on per-frame errors; they are too noisy for field use.
        }
      );
      if (startRequestRef.current !== requestId) {
        if (scanner.isScanning) {
          await scanner.stop().catch(() => {});
        }
        return;
      }
      setScanning(true);
    } catch (err) {
      if (startRequestRef.current !== requestId) return;
      setScanning(false);
      setCameraError(err instanceof Error ? err.message : 'Camera unavailable');
    }
  }

  async function stopCamera() {
    startRequestRef.current += 1;
    const scanner = scannerRef.current;
    if (scanner && scanner.isScanning) {
      await scanner.stop().catch(() => {});
    }
    setScanning(false);
    setCameraOpen(false);
  }

  async function handleResolved(id: string) {
    // Stop scanning immediately so we don't fire multiple navigations.
    const scanner = scannerRef.current;
    if (scanner && scanner.isScanning) {
      await scanner.stop().catch(() => {});
    }
    setScanning(false);
    setCameraOpen(false);
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

  if (cameraOpen) {
    return (
      <div className="fixed inset-0 z-50 h-[100dvh] min-h-[100svh] overflow-hidden bg-black text-white">
        <div id={containerId} className="scan-camera-feed absolute inset-0" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.50),rgba(0,0,0,0.04)_30%,rgba(0,0,0,0.10)_60%,rgba(0,0,0,0.68))]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(184,32,46,0.22)_0_2px,transparent_2px)]" />

        <header className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between px-4 pt-[max(16px,env(safe-area-inset-top))]">
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-wide text-red-200">
              ChemTrack Scanner
            </div>
            <div className="text-2xl font-extrabold tracking-tight">
              Scan Tote QR
            </div>
          </div>
          <button
            type="button"
            className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/10 text-white backdrop-blur active:bg-white/20"
            onClick={() => void stopCamera()}
            aria-label="Close camera"
          >
            <X size={26} />
          </button>
        </header>

        <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 aspect-square w-[min(74vw,340px)] -translate-x-1/2 -translate-y-1/2">
          <div className="absolute left-0 top-0 h-16 w-16 border-l-4 border-t-4 border-white" />
          <div className="absolute right-0 top-0 h-16 w-16 border-r-4 border-t-4 border-white" />
          <div className="absolute bottom-0 left-0 h-16 w-16 border-b-4 border-l-4 border-white" />
          <div className="absolute bottom-0 right-0 h-16 w-16 border-b-4 border-r-4 border-white" />
          <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-primary shadow-[0_0_20px_rgba(184,32,46,0.95)]" />
          {!scanning && !cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/85">
              <QrCode size={72} />
              <div className="text-sm font-extrabold uppercase tracking-wide">
                Starting camera...
              </div>
            </div>
          )}
        </div>

        <footer className="absolute bottom-0 left-0 right-0 z-10 px-4 pb-[max(14px,env(safe-area-inset-bottom))]">
          {cameraError ? (
            <div className="rounded-lg bg-black/75 p-4 text-center text-sm backdrop-blur">
              <div className="font-extrabold">Camera unavailable</div>
              <div className="mt-1 text-white/75">{cameraError}</div>
              <button
                type="button"
                className="mt-3 min-h-[48px] w-full rounded-lg bg-white text-sm font-extrabold uppercase tracking-wide text-ink active:bg-surface-sunken"
                onClick={() => void stopCamera()}
              >
                Use Manual Lookup
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 rounded-lg bg-black/55 p-3 backdrop-blur">
              <button
                type="button"
                className="flex min-h-[52px] items-center justify-center gap-2 rounded-lg bg-white text-sm font-extrabold uppercase tracking-wide text-ink active:bg-surface-sunken"
                onClick={() => void stopCamera()}
              >
                <Keyboard size={18} />
                Manual Lookup
              </button>
              <button
                type="button"
                className="flex min-h-[52px] items-center justify-center gap-2 rounded-lg bg-primary text-sm font-extrabold uppercase tracking-wide text-white active:bg-primary-dark"
                onClick={() => void handleResolved('RH-250414-007')}
              >
                <QrCode size={18} />
                Demo Tote
              </button>
            </div>
          )}
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-surface-alt text-ink">
      <main className="mx-auto flex min-h-full max-w-xl flex-col pb-[88px]">
        <header className="bg-chrome px-5 pb-4 pt-6 text-white">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <ChemTrackMark />
              <div>
                <div className="text-[11px] font-extrabold uppercase tracking-wide text-red-200">
                  Coil Tubing Operations
                </div>
                <div className="text-lg font-extrabold tracking-wide text-white">
                  ChemTrack Scan
                </div>
                <OfflineBadge />
              </div>
            </div>
            <button
              className="flex h-11 w-11 items-center justify-center rounded-lg active:bg-white/10"
              aria-label="Menu"
            >
              <Menu size={25} />
            </button>
          </div>
        </header>

        <section className="bg-white px-5 pb-6 pt-6 text-ink shadow-sm">
            <div className="text-center">
              <div className="text-2xl font-extrabold">Scan Tote QR Code</div>
              <div className="mt-1 text-sm text-ink-muted">
                Enter a tote ID or start the camera scanner
              </div>
            </div>

          <form onSubmit={submitManual} className="mt-6 space-y-3">
            <div className="label flex items-center justify-center gap-2">
              <Keyboard size={15} />
              Or enter tote ID manually
            </div>
            <div className="flex overflow-hidden rounded-lg border border-slate-300 bg-white">
              <input
                className="min-h-[56px] flex-1 px-4 font-mono text-sm font-semibold outline-none"
                placeholder="Enter Tote ID (e.g. RH-250414-007)"
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
              />
              <div className="flex w-14 items-center justify-center border-l border-slate-200 text-ink-muted">
                <ScanLine size={21} />
              </div>
            </div>
            <button className="btn-primary w-full" type="submit">
              <Search size={18} />
              Search
            </button>
            <button
              className="btn-secondary w-full font-mono"
              type="button"
              onClick={() => void handleResolved('RH-250414-007')}
            >
              Open Demo Tote RH-250414-007
            </button>
          </form>
        </section>

        <section className="px-5 py-4">
          <button className="btn-action w-full" type="button" onClick={startCamera}>
            <Camera size={18} />
            Start Camera Scan
          </button>
        </section>
      </main>
      <BottomNav />
    </div>
  );
}

function waitForScannerElement(id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const tick = () => {
      if (document.getElementById(id)) {
        resolve();
        return;
      }
      attempts += 1;
      if (attempts > 20) {
        reject(new Error('Scanner container did not render'));
        return;
      }
      requestAnimationFrame(tick);
    };
    tick();
  });
}
