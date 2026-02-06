"use client";

import NavigationsList from "@/data/navigations-list";
import React from "react";

export default function ListPages() {
  const LIST_NAVIGATIONS = NavigationsList();

  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {LIST_NAVIGATIONS.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <a
            key={index}
            href={item.url}
            className="text-sm text-primary hover:text-primary/50 duration-150 hover:underline"
          >
            {item.name}
          </a>
          {index < LIST_NAVIGATIONS.length - 1 && (
            <span className="text-slate-300 dark:text-slate-500">•</span>
          )}
        </div>
      ))}
    </div>
  );
}
