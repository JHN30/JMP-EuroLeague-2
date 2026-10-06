export default function HeaderStats({ className = "", children, ...rest }) {
  return (
    <div className={`kpi-strip ${className}`} {...rest}>
      {children}
    </div>
  );
}
