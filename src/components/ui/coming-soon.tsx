import { Construction } from "lucide-react";

export function ComingSoon({
  title,
  description,
  phase,
}: {
  title: string;
  description?: string;
  phase: string;
}) {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="card text-center">
        <Construction className="mx-auto h-10 w-10 text-amber-500" />
        <h1 className="mt-4 text-xl font-bold">{title}</h1>
        {description && (
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            {description}
          </p>
        )}
        <p className="mt-3 text-xs uppercase tracking-wide text-blue-600 dark:text-blue-400">
          {phase}
        </p>
      </div>
    </div>
  );
}
