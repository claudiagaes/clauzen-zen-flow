import { NavLink, useLocation } from "react-router-dom";
import { Home, Receipt, Users, MapPin, BarChart3 } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";

const items = [
  { title: "Overview", url: "/", icon: Home },
  { title: "Expenses", url: "/expenses", icon: Receipt },
  { title: "People", url: "/people", icon: Users },
  { title: "Trips & Events", url: "/trips", icon: MapPin },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();


  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="px-4 pt-6 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🧘</span>
          {!collapsed && (
            <div className="leading-tight">
              <div className="font-display text-xl text-foreground">Clauzen</div>
              <div className="text-[11px] text-muted-foreground -mt-0.5">Calm over your money</div>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 mt-4">
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground px-3">
              Dashboard
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {items.map((item) => {
                const active = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      className={`rounded-2xl h-11 transition-all ${
                        active
                          ? "bg-primary-soft text-primary font-medium hover:bg-primary-soft"
                          : "hover:bg-sidebar-accent text-sidebar-foreground"
                      }`}
                    >
                      <NavLink to={item.url}>
                        <item.icon className="h-[18px] w-[18px]" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

  );
}
