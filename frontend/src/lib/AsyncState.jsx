import IconAlertTriangle from "@tabler/icons-react/dist/esm/icons/IconAlertTriangle.mjs";
import EmptyText from "./EmptyText";

export default function AsyncState({
  status,
  message,
  label = "Loading",
  onRetry,
  inline = false,
  fullScreen = false,
  compact = false,
  errorClassName = "",
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
    const retry = onRetry ? (
      <button type="button" className={compact ? "btn btn-sm" : "btn btn-primary min-h-11 w-full sm:w-auto"} onClick={onRetry}>
        Retry
      </button>
    ) : null;
    // A section card keeps the small alert so the card does not grow; a page or a big block gets the full panel, centred in its width.
    const alert = compact ? (
      <div role="alert" className={`alert alert-error ${errorClassName}`}>
        <span>{message}</span>
        {retry}
      </div>
    ) : (
      <div
        role="alert"
        className={`mx-auto flex w-full flex-col items-center gap-4 rounded-box border border-error/40 border-t-error border-t-2 bg-base-100 px-4 py-8 text-center sm:px-8 ${fullScreen ? "max-w-md" : ""} ${errorClassName}`}
      >
        <IconAlertTriangle aria-hidden="true" className="size-9 text-error" stroke={1.75} />
        <p className="wrap-break-word text-base font-semibold">{message}</p>
        {retry}
      </div>
    );
    if (!fullScreen) return alert;
    return <div className="flex min-h-screen items-center justify-center p-3 sm:p-6">{alert}</div>;
  }

  return <EmptyText>{message}</EmptyText>;
}
