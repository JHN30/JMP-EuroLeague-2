export default function SummaryGrid({ children }) {
  return <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">{children}</dl>;
}
