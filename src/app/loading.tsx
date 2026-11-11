export default function Loading() {
  return (
    <div className="space-y-6 py-10">
      <div className="h-4 w-24 animate-pulse rounded bg-white/10" />
      <div className="h-12 w-2/3 animate-pulse rounded-xl bg-white/10" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <div key={index} className="h-24 animate-pulse rounded-2xl bg-white/[0.06]" />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-2xl bg-white/[0.04]" />
    </div>
  );
}
