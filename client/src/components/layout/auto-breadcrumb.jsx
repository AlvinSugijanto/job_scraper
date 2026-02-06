"use client";

import React from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";

/**
 * Auto generates breadcrumb from current pathname
 * Example: /dashboard/users/edit → Dashboard › Users › Edit
 */
export function AutoBreadcrumb({ items }) {
  const pathname = usePathname();

  // console.log("pathname", pathname);

  // If items passed manually → use them directly
  if (items && items.length > 0) {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          {items.map((item, idx) => (
            <React.Fragment key={idx}>
              <BreadcrumbItem>
                {item.href ? (
                  <BreadcrumbLink href={item.href}>{item.label}</BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {idx < items.length - 1 && <BreadcrumbSeparator />}
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  // Otherwise, generate automatically from pathname
  const segments = pathname
    .split("/")
    .filter((seg) => seg && seg.trim().length > 0);

  if (segments.length === 0) return null;

  const toTitle = (slug) =>
    slug.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()); // capitalize words

  const breadcrumbs = segments.map((seg, i) => ({
    label: toTitle(seg),
    href: "/" + segments.slice(0, i + 1).join("/"),
  }));

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbs.map((item, idx) => (
          <React.Fragment key={item.href}>
            <BreadcrumbItem>
              {idx < breadcrumbs.length - 1 ? (
                <BreadcrumbLink href={item.href}>{item.label}</BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{item.label}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
            {idx < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

/* ✅ Custom BreadcrumbLink to prevent full refresh */
function BreadcrumbLink({ href, children, className, ...props }) {
  return (
    <Link
      href={href}
      className={cn(
        "text-sm font-medium text-muted-foreground hover:text-foreground transition-colors",
        className
      )}
      {...props}
    >
      {children}
    </Link>
  );
}

/* ✅ Separator (fixed, not <li>) */
function BreadcrumbSeparator(props) {
  return (
    <span
      role="presentation"
      aria-hidden="true"
      className={cn("[&>svg]:size-3.5 text-muted-foreground", props.className)}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </span>
  );
}
