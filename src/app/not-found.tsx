import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 dark:bg-slate-950">
      <p className="text-sm font-medium text-blue-600">404</p>
      <h1 className="mt-2 text-3xl font-bold">Page not found</h1>
      <Link href="/" className="btn-primary mt-6">
        Go home
      </Link>
    </div>
  );
}
