"use client";

import React from "react";
import Image from "next/image";

interface LogoProps {
  size?: number;
  className?: string;
}

// OpenAI Logo - Using image from public/llms
export const OpenAILogo: React.FC<LogoProps> = ({
  size = 24,
  className = "",
}) => (
  <div
    className={`relative inline-block ${className}`}
    style={{ width: size, height: size }}
  >
    <Image
      src="/llms/chatgpt.jpg"
      alt="OpenAI"
      width={size}
      height={size}
      style={{ objectFit: "contain", borderRadius: "4px" }}
      priority
    />
  </div>
);

// Anthropic Logo - Using image from public/llms
export const AnthropicLogo: React.FC<LogoProps> = ({
  size = 24,
  className = "",
}) => (
  <div
    className={`relative inline-block ${className}`}
    style={{ width: size, height: size }}
  >
    <Image
      src="/llms/claude.png"
      alt="Anthropic"
      width={size}
      height={size}
      style={{ objectFit: "contain", borderRadius: "4px" }}
      priority
    />
  </div>
);

// Google Logo - Using image from public/llms
export const GoogleLogo: React.FC<LogoProps> = ({
  size = 24,
  className = "",
}) => (
  <div
    className={`relative inline-block ${className}`}
    style={{ width: size, height: size }}
  >
    <Image
      src="/llms/gemini.png"
      alt="Google"
      width={size}
      height={size}
      style={{ objectFit: "contain", borderRadius: "4px" }}
      priority
    />
  </div>
);

// Meta Logo - Fallback SVG (no image available yet)
export const MetaLogo: React.FC<LogoProps> = ({
  size = 24,
  className = "",
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 2c5.514 0 10 4.486 10 10s-4.486 10-10 10S2 17.514 2 12 6.486 2 12 2z"
      fill="#0081FB"
    />
    <path
      d="M8.5 8c-1.5 0-2.5 1-2.5 2.5s1 2.5 2.5 2.5 2.5-1 2.5-2.5S10 8 8.5 8zm7 0c-1.5 0-2.5 1-2.5 2.5s1 2.5 2.5 2.5 2.5-1 2.5-2.5S17 8 15.5 8z"
      fill="#0081FB"
    />
  </svg>
);

// Mistral AI Logo - Fallback SVG (no image available yet)
export const MistralLogo: React.FC<LogoProps> = ({
  size = 24,
  className = "",
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path d="M5 4h3l2 8 2-8h3l-3 16h-4L5 4z" fill="#FF6B35" />
    <path d="M16 4h3l-2 16h-4l3-16z" fill="#FF6B35" opacity="0.8" />
  </svg>
);

// Component to render the appropriate logo based on provider
interface AIProviderLogoProps {
  provider: string;
  size?: number;
  className?: string;
}

export const AIProviderLogo: React.FC<AIProviderLogoProps> = ({
  provider,
  size = 24,
  className = "",
}) => {
  const logoMap: Record<string, React.ReactElement> = {
    OpenAI: <OpenAILogo size={size} className={className} />,
    Anthropic: <AnthropicLogo size={size} className={className} />,
    Google: <GoogleLogo size={size} className={className} />,
    Meta: <MetaLogo size={size} className={className} />,
    "Mistral AI": <MistralLogo size={size} className={className} />,
  };

  return logoMap[provider] || <div style={{ width: size, height: size }} />;
};
