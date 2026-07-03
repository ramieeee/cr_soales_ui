type LoadingSignalProps = {
  label?: string;
  detail?: string;
};

export function LoadingSignal({
  label = "Loading",
  detail = "Preparing signal stream...",
}: LoadingSignalProps) {
  return (
    <div className="soales-loading-overlay" role="status" aria-live="polite">
      <div className="soales-loading-card soales-route-fade">
        <div className="soales-loading-spinner" aria-hidden="true" />
        <div className="text-center">
          <p className="soales-mono uppercase text-[#93c5fd]">{label}</p>
          <p className="mt-2 text-sm text-[#9ca3af]">{detail}</p>
        </div>
      </div>
    </div>
  );
}
