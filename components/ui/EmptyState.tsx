export default function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
      <p>{message}</p>
    </div>
  );
}
