type LoadingSpinnerProps = {
  label?: string;
};

export default function LoadingSpinner({ label = "読み込み中" }: LoadingSpinnerProps) {
  return (
    <section className="page-section loading-view" aria-label={label}>
      <div className="loading-spinner" role="status" aria-live="polite">
        <svg className="loading-spinner-icon" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
          <circle className="loading-spinner-track" cx="24" cy="24" r="18" />
          <path className="loading-spinner-head" d="M42 24a18 18 0 0 1-18 18" />
        </svg>
        <span className="sr-only">{label}</span>
      </div>
    </section>
  );
}
