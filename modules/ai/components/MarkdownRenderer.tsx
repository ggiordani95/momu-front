"use client";

import { useMemo, useEffect } from "react";
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
    if (!content) {
      console.log("[MarkdownRenderer] Empty content, returning empty string");
      return "";
    }

    // Extract text from HTML if content is wrapped in HTML tags
    let cleanedContent = content.trim();

    // Check if content is wrapped in HTML tags (like <p>...</p>)
    if (cleanedContent.startsWith("<") && cleanedContent.includes(">")) {
      console.log(
        "[MarkdownRenderer] Content appears to be HTML, extracting text..."
      );
      // Use regex to strip HTML tags and decode HTML entities
      // This works in both client and server environments
      cleanedContent = cleanedContent
        .replace(/<[^>]*>/g, "") // Remove all HTML tags
        .replace(/&nbsp;/g, " ") // Replace &nbsp; with space
        .replace(/&amp;/g, "&") // Decode &amp;
        .replace(/&lt;/g, "<") // Decode &lt;
        .replace(/&gt;/g, ">") // Decode &gt;
        .replace(/&quot;/g, '"') // Decode &quot;
        .replace(/&#39;/g, "'") // Decode &#39;
        .trim();
      console.log("[MarkdownRenderer] Extracted text:", {
        originalLength: content.length,
        extractedLength: cleanedContent.length,
        first200: cleanedContent.substring(0, 200),
      });
    }

    console.log("[MarkdownRenderer] Received content:", {
      length: cleanedContent.length,
      first200: cleanedContent.substring(0, 200),
      hasHash: cleanedContent.includes("#"),
      hasAsterisk: cleanedContent.includes("*"),
      hasDash: cleanedContent.includes("-"),
      startsWithHash: cleanedContent.startsWith("#"),
    });

    try {
      // Normalize line breaks - ensure proper spacing for markdown parsing
      // Markdown needs double line breaks to create new paragraphs/blocks
      let normalizedContent = cleanedContent
        .replace(/\r\n/g, "\n") // Normalize Windows line breaks
        .replace(/\r/g, "\n") // Normalize Mac line breaks
        .replace(/\n{3,}/g, "\n\n"); // Normalize multiple line breaks to double

      // Ensure headings have proper line breaks before them
      // Add a newline before headings if they don't have one
      normalizedContent = normalizedContent.replace(
        /([^\n])(\n*#+\s)/g,
        "$1\n$2"
      );

      // Ensure list items have proper line breaks
      // Add a newline before list items if they don't have one (and aren't already in a list)
      normalizedContent = normalizedContent.replace(
        /([^\n])(\n*[-*+]\s)/g,
        "$1\n$2"
      );
      normalizedContent = normalizedContent.replace(
        /([^\n])(\n*\d+\.\s)/g,
        "$1\n$2"
      );

      console.log("[MarkdownRenderer] Normalized content:", {
        length: normalizedContent.length,
        first300: normalizedContent.substring(0, 300),
        lineBreakCount: (normalizedContent.match(/\n/g) || []).length,
        headingMatches: normalizedContent.match(/^#+\s/gm)?.length || 0,
        listMatches: normalizedContent.match(/^[-*+]\s/gm)?.length || 0,
      });

      // Initialize markdown-it with options
      const md = new MarkdownIt({
        html: true, // Enable HTML tags in source
        breaks: false, // Don't convert '\n' in paragraphs into <br> - let markdown handle structure
        linkify: true, // Autoconvert URL-like text to links
        typographer: true, // Enable some language-neutral replacement + quotes beautification
      });

      // Render markdown to HTML
      const html = md.render(normalizedContent);

      console.log("[MarkdownRenderer] Rendered HTML:", {
        length: html.length,
        first500: html.substring(0, 500),
        hasH1: html.includes("<h1"),
        hasH2: html.includes("<h2"),
        hasUl: html.includes("<ul"),
        hasStrong: html.includes("<strong"),
        hasP: html.includes("<p"),
        htmlStructure: html.substring(0, 1000),
        // Check if everything is in a single p tag
        pCount: (html.match(/<p>/g) || []).length,
        h1Count: (html.match(/<h1>/g) || []).length,
        h2Count: (html.match(/<h2>/g) || []).length,
        ulCount: (html.match(/<ul>/g) || []).length,
      });

      return html;
    } catch (error) {
      console.error("[MarkdownRenderer] Error rendering markdown:", error);
      return content; // Fallback to plain text
    }
  }, [content]);

  useEffect(() => {
    // Verify the HTML was inserted after a short delay
    setTimeout(() => {
      const elements = document.querySelectorAll(`.markdown-content`);
      console.log(
        "[MarkdownRenderer] Found",
        elements.length,
        "markdown-content elements"
      );
      elements.forEach((element, index) => {
        console.log(`[MarkdownRenderer] Element ${index}:`, {
          innerHTMLLength: element.innerHTML.length,
          firstChars: element.innerHTML.substring(0, 200),
          hasH1: element.querySelector("h1") !== null,
          hasH2: element.querySelector("h2") !== null,
          hasUl: element.querySelector("ul") !== null,
          hasStrong: element.querySelector("strong") !== null,
        });
      });
    }, 100);
  }, [htmlContent]);

  if (!htmlContent) {
    return null;
  }

  return (
    <div
      className={`markdown-content ${className}`}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
      style={{
        color: "inherit",
        lineHeight: "1.6",
        fontSize: "0.875rem",
        fontFamily:
          "system-ui, -apple-system, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'",
      }}
      data-testid="markdown-renderer"
    />
  );
}
