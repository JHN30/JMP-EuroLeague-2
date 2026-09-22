export default function Panel({ as: Tag = "div", className = "", children, ...rest }) {
  return (
    <Tag className={`panel ${className}`} {...rest}>
      {children}
    </Tag>
  );
}
