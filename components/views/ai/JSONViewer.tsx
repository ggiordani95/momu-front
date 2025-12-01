"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Copy, Check } from "lucide-react";

interface JSONViewerProps {
  data: Record<string, unknown> | unknown[];
  title?: string;
}

export function JSONViewer({ data, title = "JSON Response" }: JSONViewerProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  const formatJSON = (obj: Record<string, unknown> | unknown[]): string => {
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(formatJSON(data));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const jsonString = formatJSON(data);

  return (
    <div className="border-t border-border bg-background">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2 text-sm font-medium text-foreground/70 hover:text-foreground transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
              <span>{title}</span>
            </button>
          </div>
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-foreground/60 hover:text-foreground hover:bg-hover/50 rounded-md transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3" />
                <span>Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copiar</span>
              </>
            )}
          </button>
        </div>

        {isExpanded && (
          <div className="relative">
            <pre className="bg-hover/30 max-w-[500px] rounded-lg p-4 overflow-x-auto overflow-y-auto max-h-48 text-xs font-mono text-foreground/90 border border-border/50">
              <code>{jsonString}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
