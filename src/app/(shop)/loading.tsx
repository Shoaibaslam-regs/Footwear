/** Route-level loading skeleton: a header block and a four-up card grid. */
export default function Loading() {
  return (
    <section
      aria-busy="true"
      aria-label="Loading"
      className="w-full max-w-[1536px] mx-auto px-margin-mobile lg:px-margin py-space-xl motion-safe:animate-pulse"
    >
      <div className="h-3 w-32 rounded-full bg-surface-container-high" />
      <div className="h-10 w-72 max-w-full rounded-lg bg-surface-container-high mt-space-sm mb-space-lg" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-space-sm sm:gap-gutter">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="bg-surface-container-lowest rounded-lg p-space-sm shadow-sm"
          >
            <div className="aspect-[3/4] rounded bg-surface-container mb-space-md" />
            <div className="h-4 w-3/4 rounded-full bg-surface-container mb-2" />
            <div className="h-3 w-1/2 rounded-full bg-surface-container" />
          </div>
        ))}
      </div>
    </section>
  );
}
