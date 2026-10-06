import { Link } from "react-router";
import Panel from "./lib/Panel";
import { useDocumentTitle } from "./lib/useDocumentTitle";

export default function NotFoundPage() {
  useDocumentTitle("Page not found");
  return (
    <div className="flex min-h-screen items-center justify-center p-3 sm:p-6">
      <Panel as="section" className="max-w-md p-4 text-center sm:p-5">
        <h1 className="mb-2 text-2xl font-semibold">Page not found</h1>
        <p className="muted mb-4">This page doesn't exist or has moved.</p>
        <Link to="/" className="btn btn-primary btn-sm">
          Back to standings
        </Link>
      </Panel>
    </div>
  );
}
