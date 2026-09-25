export default function ShootingLegend({ teams }) {
  const swatchClasses = ["bg-primary", "bg-secondary"];

  return (
    <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
      {teams.map((team, index) => (
        <span key={team?.clubCode ?? index} className="flex items-center gap-1.5">
          <span aria-hidden="true" className={`inline-block h-2.5 w-2.5 rounded-full ${swatchClasses[index]}`} />
          {team?.abbreviatedName ?? team?.name ?? "TBD"}
        </span>
      ))}
      <span className="flex items-center gap-1.5">
        <span aria-hidden="true" className="border-base-content inline-block h-2.5 w-2.5 rounded-full border-2" />
        Made
      </span>
      <span className="flex items-center gap-1.5">
        <span aria-hidden="true" className="text-base-content font-bold">
          &times;
        </span>
        Missed
      </span>
    </div>
  );
}
