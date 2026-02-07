"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeft } from "lucide-react";

import { NavUser } from "./nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { Navigations } from "./navigations";
import NavigationsList from "@/data/navigations-list";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const USER = {
  name: "Admin User",
  email: "admin@example.com",
  avatar: "/avatars/default.jpg",
};

export function AppSidebar({ ...props }) {
  const { open, toggleSidebar } = useSidebar();
  const pathname = usePathname();
  const LIST_NAVIGATIONS = NavigationsList();

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="h-16 border-b border-sidebar-border">
        <div className="flex items-center justify-between w-full px-2 h-full">
          <Link href="/dashboard" className="flex items-center gap-2">
            {open ? (
              <span className="font-bold text-lg">JobScraper</span>
            ) : (
              <span className="font-bold text-lg">JS</span>
            )}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={toggleSidebar}
          >
            {open ? (
              <PanelLeftClose className="size-4" />
            ) : (
              <PanelLeft className="size-4" />
            )}
          </Button>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <Navigations navigations={LIST_NAVIGATIONS} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={USER} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
