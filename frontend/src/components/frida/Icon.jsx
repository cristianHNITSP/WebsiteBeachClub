export default function Icon({ name, size = 20, style }) {
  return (
    <span
      className="material-symbols-outlined"
      style={{ fontSize: `${size}px`, lineHeight: 1, verticalAlign: 'middle', ...style }}
    >
      {name}
    </span>
  )
}
