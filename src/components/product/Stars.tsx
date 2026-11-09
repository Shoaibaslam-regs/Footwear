/** Read-only star rating, rounded to the nearest half star. */
export default function Stars({
  value = 5,
  size,
  className = "",
}: {
  value?: number;
  size: string;
  className?: string;
}) {
  const v = Math.round(Math.max(0, Math.min(5, value)) * 2) / 2;
  return (
    <div aria-label={`${v} out of 5 stars`} className={`flex text-secondary ${className}`} role="img">
      {Array.from({ length: 5 }, (_, i) => {
        const icon = v >= i + 1 ? "star" : v >= i + 0.5 ? "star_half" : "star";
        const filled = v >= i + 0.5;
        return (
          <span
            key={i}
            aria-hidden="true"
            className={`material-symbols-outlined ${size}${filled ? " icon-filled" : " text-outline-variant"}`}
          >
            {icon}
          </span>
        );
      })}
    </div>
  );
}
