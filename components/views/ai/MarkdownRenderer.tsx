"use client";

import { useMemo } from "react";
import MarkdownIt from "markdown-it";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({
  content,
  className = "",
}: MarkdownRendererProps) {
  const htmlContent = useMemo(() => {
    if (!content) return "";

    // Initialize markdown-it with options similar to Tiptap rendering
    const md = new MarkdownIt({
      html: true, // Enable HTML tags in source
      breaks: true, // Convert '\n' in paragraphs into <br>
      linkify: true, // Autoconvert URL-like text to links
      typographer: true, // Enable some language-neutral replacement + quotes beautification
    });

    // Render markdown to HTML
    const html = md.render(content);

    return html;
  }, [content]);

  return (
    <div
      className={`prose prose-sm max-w-none dark:prose-invert ${className}`}
      style={{
        // Custom styles to match Tiptap editor appearance
        color: "inherit",
      }}
    >
      <div
        dangerouslySetInnerHTML={{ __html: htmlContent }}
        className="markdown-content"
        style={{
          // Styles to match Tiptap editor
          lineHeight: "1.6",
          fontSize: "1rem",
          // Ensure emojis are displayed correctly
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'",
        }}
      />
      <style jsx global>{`
        .markdown-content {
          color: inherit;
        }
        .markdown-content h1 {
          font-size: 2em;
          font-weight: 700;
          margin-top: 0.67em;
          margin-bottom: 0.67em;
          line-height: 1.2;
        }
        .markdown-content h2 {
          font-size: 1.5em;
          font-weight: 600;
          margin-top: 0.83em;
          margin-bottom: 0.83em;
          line-height: 1.3;
        }
        .markdown-content h3 {
          font-size: 1.25em;
          font-weight: 600;
          margin-top: 1em;
          margin-bottom: 1em;
          line-height: 1.4;
        }
        .markdown-content h4 {
          font-size: 1.1em;
          font-weight: 600;
          margin-top: 1.2em;
          margin-bottom: 1.2em;
          line-height: 1.4;
        }
        .markdown-content p {
          margin-top: 0.5em;
          margin-bottom: 0.5em;
          line-height: 1.6;
        }
        .markdown-content ul,
        .markdown-content ol {
          margin-top: 0.5em;
          margin-bottom: 0.5em;
          padding-left: 1.5em;
        }
        .markdown-content li {
          margin-top: 0.25em;
          margin-bottom: 0.25em;
        }
        .markdown-content blockquote {
          border-left: 3px solid currentColor;
          padding-left: 1em;
          margin: 1em 0;
          opacity: 0.7;
          font-style: italic;
        }
        .markdown-content code {
          background-color: rgba(0, 0, 0, 0.1);
          padding: 0.2em 0.4em;
          border-radius: 3px;
          font-size: 0.9em;
          font-family: "Courier New", monospace;
        }
        .markdown-content pre {
          background-color: rgba(0, 0, 0, 0.1);
          padding: 1em;
          border-radius: 6px;
          overflow-x: auto;
          margin: 1em 0;
        }
        .markdown-content pre code {
          background-color: transparent;
          padding: 0;
        }
        .markdown-content a {
          color: inherit;
          text-decoration: underline;
          opacity: 0.8;
        }
        .markdown-content a:hover {
          opacity: 1;
        }
        .markdown-content strong {
          font-weight: 700;
        }
        .markdown-content em {
          font-style: italic;
        }
        .markdown-content img {
          max-width: 100%;
          height: auto;
          border-radius: 4px;
          margin: 1em 0;
        }
        .markdown-content hr {
          border: none;
          border-top: 1px solid currentColor;
          opacity: 0.2;
          margin: 2em 0;
        }
        .markdown-content {
          /* Ensure emojis render correctly */
          font-family: system-ui, -apple-system, "Segoe UI", "Roboto",
            "Helvetica", "Arial", sans-serif, "Apple Color Emoji",
            "Segoe UI Emoji", "Segoe UI Symbol";
        }
        .markdown-content * {
          /* Preserve emoji rendering */
          font-variant-emoji: emoji;
        }
      `}</style>
    </div>
  );
}
