export default function FolderSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-4 rounded-3xl animate-pulse min-h-[180px] w-full">
      <div className="w-16 h-16 rounded-lg bg-foreground/10" />
      <div className="h-4 w-24 rounded bg-foreground/10" />
    </div>
  );
}
