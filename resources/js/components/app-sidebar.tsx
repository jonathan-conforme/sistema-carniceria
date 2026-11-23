import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link } from '@inertiajs/react';
import { BookOpen, Folder, LayoutGrid, Package, BarChart3, Receipt, ShoppingCart } from 'lucide-react';
import React from 'react';
import AppLogo from './app-logo';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        url: '/dashboard',
        icon: LayoutGrid,
    },
    {
        title: 'Pos',
        url: '/pos',
        icon: ShoppingCart,
    },
    {
        title: 'Ventas',
        url: '/ventas',
        icon: Receipt,
    },
    {
        title: 'Inventario',
        url: '/inventario',
        icon: Package,
    },
    {
        title: 'Reportes',
        url: '/reportes',
        icon: BarChart3,
    },
     {
        title: 'Usuarios',
        url: '/usuarios',
        icon: BarChart3,
    },
];

const footerNavItems: NavItem[] = [
    {
        title: 'Repository',
        url: 'https://github.com/laravel/react-starter-kit',
        icon: Folder,
    },
    {
        title: 'Documentation',
        url: 'https://laravel.com/docs/starter-kits',
        icon: BookOpen,
    },
];

const sidebarColors = {
    '--sidebar': '#34222E',
    '--sidebar-foreground': '#FEE9D6',
    '--sidebar-primary': '#E2424A',
    '--sidebar-primary-foreground': '#FFFFFF',
    '--sidebar-accent': '#472F3F',
    '--sidebar-accent-foreground': '#F9BF8F',
    '--sidebar-border': 'rgba(249, 191, 143, 0.16)',
    '--sidebar-ring': '#E2424A',
} as React.CSSProperties;

export function AppSidebar() {
    return (
        <Sidebar
            collapsible="icon"
            variant="inset"
            style={sidebarColors}
            className="bg-[#34222E] text-[#FEE9D6]"
        >
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/dashboard" prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
