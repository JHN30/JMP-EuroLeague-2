export default function EmptyText({ children }) {
  return (
    <p role="status" className="muted">
      {children}
    </p>
  );
}
