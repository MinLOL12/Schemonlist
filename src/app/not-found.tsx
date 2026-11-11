import Link from "next/link";

export const metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl py-24 text-center">
      <p className="font-mono text-7xl font-black text-gradient">404</p>
      <h1 className="mt-4 text-2xl font-bold text-white">This level is not on the list</h1>
      <p className="mt-2 text-sm text-slate-400">
        The page you are looking for does not exist, was unlisted, or the URL is
        mistyped.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Link href="/list" className="btn btn-primary">Browse the demonlist</Link>
        <Link href="/" className="btn btn-ghost">Home</Link>
      </div>
    </div>
  );
}
