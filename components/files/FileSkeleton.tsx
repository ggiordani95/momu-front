export default function FileSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-4 rounded-3xl animate-pulse min-h-[180px] w-full">
      <div className="w-24 h-24 rounded-lg bg-foreground/10" />
      <div className="h-4 w-32 rounded bg-foreground/10" />
    </div>
  );
}
