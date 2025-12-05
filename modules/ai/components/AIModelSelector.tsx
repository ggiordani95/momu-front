"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { AIProviderLogo } from "@/modules/ai/components/AILogos";

// Modelos de IA disponíveis via OpenRouter
export const AI_MODELS = [
  {
    value: "openai/gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "OpenAI",
    description: "Rápido e Econômico",
    color: "bg-green-500/10 border-green-500/20 text-green-600",
    iconBg: "bg-white",
  },
  {
    value: "openai/gpt-4o",
    name: "GPT-4o",
    provider: "OpenAI",
    description: "Mais Capaz",
    color: "bg-green-500/10 border-green-500/20 text-green-600",
    iconBg: "bg-white",
  },
  {
    value: "openai/gpt-4-turbo",
    name: "GPT-4 Turbo",
    provider: "OpenAI",
    description: "Equilibrado",
    color: "bg-green-500/10 border-green-500/20 text-green-600",
    iconBg: "bg-white",
  },
  {
    value: "anthropic/claude-3.5-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    description: "Inteligente",
    color: "bg-orange-500/10 border-orange-500/20 text-orange-600",
    iconBg: "bg-orange-600",
  },
  {
    value: "anthropic/claude-3-opus",
    name: "Claude 3 Opus",
    provider: "Anthropic",
    description: "Mais Poderoso",
    color: "bg-orange-500/10 border-orange-500/20 text-orange-600",
    iconBg: "bg-orange-600",
  },
  {
    value: "google/gemini-pro-1.5",
    name: "Gemini Pro 1.5",
    provider: "Google",
    description: "Multimodal",
    color: "bg-blue-500/10 border-blue-500/20 text-blue-600",
    iconBg: "bg-white",
  },
  {
    value: "meta-llama/llama-3.1-70b-instruct",
    name: "Llama 3.1 70B",
    provider: "Meta",
    description: "Open Source",
    color: "bg-purple-500/10 border-purple-500/20 text-purple-600",
    iconBg: "bg-blue-600",
  },
  {
    value: "mistralai/mistral-large",
    name: "Mistral Large",
    provider: "Mistral AI",
    description: "Europeu",
    color: "bg-red-500/10 border-red-500/20 text-red-600",
    iconBg: "bg-white",
  },
] as const;

export type AIModelValue = (typeof AI_MODELS)[number]["value"];

interface AIModelSelectorProps {
  selectedModel: AIModelValue;
  onModelChange: (model: AIModelValue) => void;
  disabled?: boolean;
  compact?: boolean;
}

export function AIModelSelector({
  selectedModel,
  onModelChange,
  disabled = false,
  compact = false,
}: AIModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedModelData = AI_MODELS.find((m) => m.value === selectedModel);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  if (compact) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className="flex items-center gap-2 px-3 py-1.5 bg-background border border-border rounded-md text-sm text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[240px]"
        >
          <div className="w-6 h-6 shrink-0 flex items-center justify-center overflow-hidden rounded-lg">
            {selectedModelData && (
              <AIProviderLogo
                provider={selectedModelData.provider}
                size={24}
                className="w-full h-full"
              />
            )}
          </div>
          <span className="flex-1 text-left truncate font-semibold">
            {selectedModelData?.name}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-foreground/40 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {isOpen && (
          <div className="absolute top-full mt-1 left-0 right-0 bg-background border border-border rounded-lg shadow-lg z-50 max-h-[400px] overflow-y-auto">
            {AI_MODELS.map((model) => (
              <button
                key={model.value}
                type="button"
                onClick={() => {
                  onModelChange(model.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-hover/50 transition-colors ${
                  selectedModel === model.value ? "bg-hover/30" : ""
                }`}
              >
                <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                  <AIProviderLogo
                    provider={model.provider}
                    size={24}
                    className="w-full h-full"
                  />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">
                    {model.name}
                  </div>
                  <div className="text-xs text-foreground/50 truncate">
                    {model.provider} · {model.description}
                  </div>
                </div>
                {selectedModel === model.value && (
                  <Check className="w-4 h-4 text-foreground/60 shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border transition-all ${
          selectedModelData?.color || "bg-background border-border"
        } hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed min-w-[240px]`}
      >
        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
          {selectedModelData && (
            <AIProviderLogo
              provider={selectedModelData.provider}
              size={32}
              className="w-full h-full"
            />
          )}
        </div>
        <div className="flex-1 text-left min-w-0">
          <div className="text-sm font-semibold text-foreground truncate">
            {selectedModelData?.name}
          </div>
          <div className="text-xs text-foreground/60 truncate">
            {selectedModelData?.provider} · {selectedModelData?.description}
          </div>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-foreground/40 transition-transform shrink-0 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          {/* Dropdown */}
          <div className="absolute top-full mt-2 left-0 right-0 bg-background border border-border rounded-lg shadow-xl z-50 max-h-[450px] overflow-y-auto">
            <div className="p-2">
              {AI_MODELS.map((model) => (
                <button
                  key={model.value}
                  type="button"
                  onClick={() => {
                    onModelChange(model.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
                    selectedModel === model.value
                      ? `${model.color} ring-2 ring-offset-1`
                      : "hover:bg-hover/30"
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                    <AIProviderLogo
                      provider={model.provider}
                      size={32}
                      className="w-full h-full"
                    />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-sm font-semibold text-foreground">
                      {model.name}
                    </div>
                    <div className="text-xs text-foreground/60">
                      {model.provider} · {model.description}
                    </div>
                  </div>
                  {selectedModel === model.value && (
                    <Check className="w-5 h-5 text-foreground shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
