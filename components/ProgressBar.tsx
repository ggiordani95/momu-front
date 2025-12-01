"use client";

import { useWorkspaceProgress } from "@/lib/hooks/querys/useProgress";

interface ProgressBarProps {
  workspaceId: string | null;
  className?: string;
  showLabel?: boolean;
  compact?: boolean;
}

export function ProgressBar({
  workspaceId,
  className = "",
  showLabel = true,
  compact = false,
}: ProgressBarProps) {
  const { data: progress, isLoading } = useWorkspaceProgress(workspaceId);

  if (!workspaceId || isLoading || !progress) {
    return null;
  }

  const percentage = progress.progress_percentage || 0;

  return (
    <div className={`w-full ${className}`}>
      {showLabel && !compact && (
        <div className="flex items-center justify-between mb-1.5 px-1">
          <span className="text-xs font-medium text-foreground/70">
            Progresso
          </span>
          <span className="text-xs font-semibold text-foreground">
            {percentage}%
          </span>
        </div>
      )}
      <div
        className={`bg-hover rounded-full overflow-hidden ${
          compact ? "h-1.5" : "h-2"
        }`}
      >
        <div
          className={`h-full transition-all duration-500 ease-out ${
            percentage === 100
              ? "bg-green-500"
              : percentage >= 50
              ? "bg-blue-500"
              : percentage >= 25
              ? "bg-yellow-500"
              : "bg-gray-400"
          }`}
          style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
        />
      </div>
      {showLabel && compact && (
        <div className="flex items-center justify-between mt-1 px-1">
          <span className="text-xs text-foreground/60">
            {progress.completed_files} / {progress.total_files}
          </span>
          <span className="text-xs font-semibold text-foreground">
            {percentage}%
          </span>
        </div>
      )}
    </div>
  );
}

