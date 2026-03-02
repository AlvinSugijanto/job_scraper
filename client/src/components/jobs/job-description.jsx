"use client";

import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";

const components = {
  // Headings
  h1: ({ children }) => (
    <h1 className="text-sm font-bold mt-4 mb-2 text-foreground">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-sm font-bold text-foreground">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-semibold text-foreground">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-sm font-semibold text-foreground">{children}</h4>
  ),

  // Paragraph
  p: ({ children }) => (
    <p className="mb-2 text-sm leading-relaxed text-foreground">{children}</p>
  ),

  // Unordered list
  ul: ({ children }) => (
    <ul className="my-2 ml-5 list-disc space-y-1">{children}</ul>
  ),

  // Ordered list
  ol: ({ children }) => (
    <ol className="my-2 ml-5 list-decimal space-y-1">{children}</ol>
  ),

  // List item — strip leading <br> that Jobstreet sometimes puts inside <li>
  li: ({ children }) => (
    <li className="text-sm leading-relaxed text-foreground pl-1">{children}</li>
  ),

  // Bold / italic
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,

  // Links
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline underline-offset-2 hover:text-primary/80"
    >
      {children}
    </a>
  ),

  // Divider
  hr: () => <hr className="my-4 border-border" />,

  // Blockquote
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-border pl-4 italic text-muted-foreground my-3">
      {children}
    </blockquote>
  ),

  // Inline code
  code: ({ children }) => (
    <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">
      {children}
    </code>
  ),

  // Span — used heavily by Jobstreet HTML; render as plain text wrapper
  span: ({ children }) => <span>{children}</span>,

  // Div
  div: ({ children }) => (
    <div className="text-foreground text-sm">{children}</div>
  ),
};

/**
 * Renders job description HTML safely using react-markdown
 */
export function JobDescription({ description }) {
  if (!description) return null;

  return (
    <div className="job-description max-w-none">
      <ReactMarkdown
        rehypePlugins={[rehypeRaw, rehypeSanitize]}
        components={components}
      >
        {description}
      </ReactMarkdown>
    </div>
  );
}
