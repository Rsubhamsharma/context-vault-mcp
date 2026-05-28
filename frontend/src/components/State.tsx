export function Loading() {
  return <div className="state">Loading...</div>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="state">{children}</div>;
}

export function ErrorBox({ message }: { message: string }) {
  return <div className="error">{message}</div>;
}
