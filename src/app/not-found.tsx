import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-5xl font-semibold text-brand-600">404</p>
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="text-sm text-slate-500">The page you're looking for doesn't exist or has moved.</p>
      <Link href="/" className="btn btn-md btn-primary mt-2">Back to home</Link>
    </div>
  );
}
