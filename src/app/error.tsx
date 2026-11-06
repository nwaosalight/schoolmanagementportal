'use client';
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="max-w-md text-sm text-slate-500">{error.message}</p>
      <button onClick={reset} className="btn btn-md btn-primary mt-2">Try again</button>
    </div>
  );
}
