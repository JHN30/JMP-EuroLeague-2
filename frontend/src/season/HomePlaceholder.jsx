import { useParams } from "react-router";

export default function HomePlaceholder() {
  const { seasonCode } = useParams();

  return (
    <div className="panel p-6">
      <p className="eyebrow">Season {seasonCode}</p>
      <h1 className="text-2xl font-semibold">Home dashboard coming soon</h1>
      <p className="muted">This placeholder will be replaced by the season home dashboard.</p>
    </div>
  );
}
