export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg" />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
      </div>
      <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
    </div>
  );
}
