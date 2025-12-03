"use client";

import { useWorkspaceProgressQuery } from "@/modules/workspace";
import { Video, FileText, Folder, TrendingUp } from "lucide-react";

interface ProgressSectionProps {
  workspaceId: string | null;
}

export function ProgressSection({ workspaceId }: ProgressSectionProps) {
  const { data: progress, isLoading } = useWorkspaceProgressQuery(workspaceId);

  if (!workspaceId || isLoading || !progress) {
    return null;
  }

  const percentage = progress.progress_percentage || 0;
  const hasFiles = progress.total_files > 0;

  if (!hasFiles) {
    return null;
  }

  return (
    <div className="px-2 py-3 border-t border-border">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <TrendingUp size={14} className="text-foreground/60" />
            <span className="text-xs font-semibold text-foreground/80">
              Progresso
            </span>
          </div>
          <span className="text-xs font-bold text-foreground">
            {percentage}%
          </span>
        </div>

        {/* Progress Bar */}
        <div className="bg-hover rounded-full overflow-hidden h-2">
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

        {/* Statistics */}
        <div className="space-y-2 px-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-foreground/60">Total</span>
            <span className="text-xs font-medium text-foreground">
              {progress.completed_files} / {progress.total_files}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
