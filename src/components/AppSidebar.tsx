import { Home, Swords, Map, Bot, Megaphone, Radio, CalendarDays, FolderArchive, Settings, Shield } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const mainItems = [
  { title: "Tableau de bord", url: "/", icon: Home },
  { title: "Analyser un contenu", url: "/analyser", icon: Swords },
  { title: "Radar Politique DRC", url: "/radar", icon: Map },
  { title: "Stratège IA", url: "/stratege", icon: Bot },
  { title: "Générer du contenu", url: "/generer", icon: Megaphone },
  { title: "Veille Twitter", url: "/veille", icon: Radio },
  { title: "Planificateur", url: "/planificateur", icon: CalendarDays },
];

const bottomItems = [
  { title: "Mes archives", url: "/archives", icon: FolderArchive },
  { title: "Paramètres", url: "/parametres", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  return (
    <Sidebar collapsible="icon" className="border-r border-border/30 hidden md:flex">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <img src={logo} alt="PIM Logo" className="h-8 w-8 shrink-0 opacity-80" />
          {!collapsed && (
            <div>
              <h1 className="text-sm font-semibold tracking-tight text-foreground/80">
                PIM
              </h1>
              <p className="text-[10px] text-muted-foreground leading-tight tracking-wide uppercase">
                Political Image Manager
              </p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="hover:bg-accent/60 transition-colors text-sidebar-foreground"
                      activeClassName="bg-accent text-foreground"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="text-[13px]">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-2 pb-4">
        <div className="system-line mb-3" />
        <SidebarMenu>
          {bottomItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                isActive={isActive(item.url)}
                tooltip={item.title}
              >
                <NavLink
                  to={item.url}
                  className="hover:bg-accent/60 transition-colors text-sidebar-foreground"
                  activeClassName="bg-accent text-foreground"
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span className="text-[13px]">{item.title}</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
