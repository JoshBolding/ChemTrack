export default function ChemTrackMark({ className = '' }: { className?: string }) {
  return (
    <div
      className={`inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white shadow-sm ${className}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 32 32" className="h-7 w-7" fill="none">
        <rect x="6" y="7" width="20" height="18" rx="2" stroke="currentColor" strokeWidth="2.2" />
        <path d="M6 14h20M14 7v18" stroke="currentColor" strokeWidth="2.2" />
        <path d="M20 18h2.6v2.6H20zM16.2 18h2.1v2.1h-2.1zM20 21.8h2.1v2.1H20z" fill="currentColor" />
      </svg>
    </div>
  );
}
