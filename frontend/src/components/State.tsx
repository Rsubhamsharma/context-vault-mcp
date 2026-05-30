export function Loading() {
  return (
    <div className="state loadingState" aria-label="Loading" aria-live="polite">
      <span></span>
      <span></span>
      <span></span>
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="state emptyState">{children}</div>;
}

export function ErrorBox({ message }: { message: string }) {
  return <div className="error" role="alert">{message}</div>;
}
