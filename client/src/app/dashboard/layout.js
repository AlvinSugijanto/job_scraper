import { AppSidebar } from "@/components/layout/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { AutoBreadcrumb } from "@/components/layout/auto-breadcrumb";
import { ModeToggle } from "@/components/layout/mode-toogle";

export const metadata = {
  title: "Dashboard | Next.js Boilerplate",
};

export default function DashboardLayout({ children }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Header */}
        <header className="flex h-16 items-center gap-4 border-b bg-background px-6">
          <AutoBreadcrumb />
          <div className="ml-auto flex items-center gap-4">
            <ModeToggle />
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
