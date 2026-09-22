import EmptyText from "./EmptyText";

export default function AsyncState({
  status,
  message,
  label = "Loading",
  onRetry,
  inline = false,
  fullScreen = false,
  compact = false,
  errorClassName = "max-w-md",
  children,
}) {
  if (status === "ready") return children;

  if (inline) {
    if (status === "loading") {
      return <span role="status" aria-label={label} className="loading loading-spinner loading-sm text-primary" />;
    }
    if (status === "error") {
      return <span role="alert" className="muted text-sm">{message}</span>;
    }
    return <span role="status" className="muted text-sm">{message}</span>;
  }

  if (status === "loading") {
    const wrapperClass = fullScreen
      ? "flex min-h-screen items-center justify-center"
      : compact
        ? "flex justify-center py-6"
        : "flex justify-center py-12";
    return (
      <div role="status" aria-label={label} className={wrapperClass}>
        <span className={`loading loading-spinner ${compact ? "" : "loading-lg"} text-primary`} />
      </div>
    );
  }

  if (status === "error") {
    const alert = (
      <div role="alert" className={`alert alert-error ${errorClassName}`}>
        <span>{message}</span>
        {onRetry ? (
          <button type="button" className="btn btn-sm" onClick={onRetry}>
            Retry
          </button>
        ) : null}
      </div>
    );
    if (!fullScreen) return alert;
    return <div className="flex min-h-screen items-center justify-center p-6">{alert}</div>;
  }

  return <EmptyText>{message}</EmptyText>;
}
