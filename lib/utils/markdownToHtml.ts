import MarkdownIt from "markdown-it";

/**
 * Converts Markdown to HTML for Tiptap editor
 * This ensures that markdown content from AI responses is properly formatted
 * when inserted into the Tiptap editor
 */
export function markdownToHtml(markdown: string): string {
  if (!markdown) return "";

  // Initialize markdown-it with options similar to Tiptap rendering
  const md = new MarkdownIt({
    html: true, // Enable HTML tags in source
    breaks: true, // Convert '\n' in paragraphs into <br>
    linkify: true, // Autoconvert URL-like text to links
    typographer: true, // Enable some language-neutral replacement + quotes beautification
  });

  // Emojis are already supported natively in markdown-it
  // They will be rendered as-is in the HTML output

  // Render markdown to HTML
  const html = md.render(markdown);

  return html;
}
