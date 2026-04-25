import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Outlet } from "react-router-dom";

export function AppLayout() {
  return (
    <SidebarProvider defaultOpen>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center px-4 md:px-8 sticky top-0 z-10 bg-background/70 backdrop-blur-xl">
            <SidebarTrigger className="rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary" />
          </header>
          <main className="flex-1 px-4 md:px-10 pb-16 max-w-[1400px] w-full mx-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
