"use client"

import * as React from "react"
import {
  Database,
  Settings,
  HelpCircle,
  Search,
  MessageSquarePlus,
  History,
  ExternalLink,
  Github,
} from "lucide-react"
import Link from "next/link"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavTools } from "@/components/nav-tools"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const data = {
  user: {
    name: "User",
    email: "user@example.com",
    avatar: "/avatars/user.jpg",
  },
  navMain: [
    {
      title: "History",
      url: "#",
      icon: History,
    },
  ],
  navSecondary: [
    {
      title: "GitHub",
      url: "https://github.com/MorpheusAIs/x402-playground",
      icon: Github,
      external: true,
    },
    {
      title: "Settings",
      url: "#",
      icon: Settings,
    },
    {
      title: "Get Help",
      url: "#",
      icon: HelpCircle,
    },
    {
      title: "Search",
      url: "#",
      icon: Search,
    },
  ],
  tools: [
    {
      name: "Paid Tools Playground",
      url: "/playground",
      icon: Database,
    },
    {
      name: "MCP Servers",
      url: "https://morpheus-registry.vercel.app/",
      icon: ExternalLink,
      external: true,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href="/">
                <Database className="!size-5" />
                <span className="text-base font-semibold">Morpheus x402 Playground</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavTools items={data.tools} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
