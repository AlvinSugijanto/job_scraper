"use client";

import { useEffect, useState } from "react";
import DOMPurify from "dompurify";

/**
 * Renders job description HTML safely using DOMPurify
 */
export function JobDescription({ description }) {
  const [sanitizedHtml, setSanitizedHtml] = useState("");

  useEffect(() => {
    if (description) {
      // Sanitize HTML to prevent XSS attacks
      const clean = DOMPurify.sanitize(description, {
        ALLOWED_TAGS: [
          "p",
          "br",
          "strong",
          "b",
          "em",
          "i",
          "u",
          "ul",
          "ol",
          "li",
          "h1",
          "h2",
          "h3",
          "h4",
          "h5",
          "h6",
          "a",
          "span",
          "div",
        ],
        ALLOWED_ATTR: ["href", "target", "rel", "class"],
      });
      setSanitizedHtml(clean);
    }
  }, [description]);

  if (!description) return null;

  return (
    <div
      className="job-description prose prose-sm dark:prose-invert max-w-none text-sm text-gray-800
        [&_ul]:list-disc [&_ul]:list-inside [&_ul]:my-2 [&_ul]:ml-2
        [&_ol]:list-decimal [&_ol]:list-inside [&_ol]:my-2 [&_ol]:ml-2
        [&_li]:text-muted-foreground [&_li]:mb-1
        [&_p]:text-muted-foreground [&_p]:mb-2
        [&_strong]:text-foreground [&_strong]:font-semibold
        [&_a]:text-primary [&_a]:underline [&_a]:hover:text-primary/80
        [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mt-4 [&_h1]:mb-2
        [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-2
        [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-2
        [&_br]:block [&_br]:content-[''] [&_br]:mb-2"
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
}
