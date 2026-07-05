type LoadingSignalProps = {
  label?: string;
  detail?: string;
};

export function LoadingSignal({
  label = "Loading",
  detail,
}: LoadingSignalProps) {
  return (
    <div className="soales-loading-overlay" role="status" aria-live="polite">
      <div className="soales-loading-card soales-route-fade">
        <div className="soales-loading-spinner" aria-hidden="true" />
        <p className="soales-loading-label">{detail ?? label}</p>
      </div>
    </div>
  );
}
