"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";

export function Navigations({ navigations }) {
  const pathname = usePathname();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  // 🧠 helper untuk normalisasi dan ambil segment pertama
  const getRootSegment = (path) => {
    if (!path) return "/";
    const parts = path.split("/").filter(Boolean); // hapus string kosong
    return parts.length > 0 ? `/${parts[0]}` : "/";
  };

  const rootSegment = getRootSegment(pathname);

  return (
    <SidebarGroup>
      {!isCollapsed && (
        <SidebarGroupLabel className="text-muted-foreground">
          Menu
        </SidebarGroupLabel>
      )}

      <SidebarMenu>
        {navigations.map((item) => {
          const hasChildren = item.items && item.items.length > 0;

          const itemRoot = getRootSegment(item.url);

          // ✅ active check - exact match or starts with item.url/
          // For /dashboard, only match exact. For others, match exact or prefix
          const isActive =
            pathname === item.url ||
            (item.url !== "/dashboard" &&
              pathname.startsWith(`${item.url}/`)) ||
            item.items?.some((sub) => pathname.startsWith(sub.url));

          return (
            <Collapsible
              key={item.name}
              asChild
              defaultOpen={isActive}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                {hasChildren ? (
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      tooltip={item.name}
                      className={`transition-colors ${
                        isActive
                          ? "bg-primary/10 text-primary font-medium"
                          : "hover:bg-muted"
                      }`}
                    >
                      {item.icon && <item.icon className="size-4 shrink-0" />}
                      <span>{item.name}</span>
                      <ChevronRight
                        className={`ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90`}
                      />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                ) : (
                  <SidebarMenuButton
                    asChild
                    tooltip={item.name}
                    className={`transition-colors ${
                      isActive
                        ? "bg-primary/10 text-primary font-medium"
                        : "hover:bg-muted"
                    }`}
                  >
                    <Link href={item.url}>
                      {item.icon && <item.icon className="size-4 shrink-0" />}
                      <span>{item.name}</span>
                    </Link>
                  </SidebarMenuButton>
                )}

                {hasChildren && (
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items.map((subItem) => {
                        const isSubActive = pathname.startsWith(subItem.url);
                        return (
                          <SidebarMenuSubItem key={subItem.name}>
                            <SidebarMenuSubButton
                              asChild
                              className={`pl-8 transition-colors ${
                                isSubActive
                                  ? "bg-primary/10 text-primary font-medium"
                                  : "hover:bg-muted"
                              }`}
                            >
                              <Link href={subItem.url}>
                                <span>{subItem.name}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        );
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                )}
              </SidebarMenuItem>
            </Collapsible>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
