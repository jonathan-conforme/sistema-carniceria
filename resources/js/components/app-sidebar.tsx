import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { BarChart3, LayoutGrid, Package, Receipt, ShoppingCart, Users } from 'lucide-react';
import React from 'react';
import AppLogo from './app-logo';

const sidebarColors = {
    '--sidebar': '#34222E',
    '--sidebar-background': '#34222E',
    '--sidebar-foreground': '#FEE9D6',
    '--sidebar-primary': '#E2424A',
    '--sidebar-primary-foreground': '#FFFFFF',
    '--sidebar-accent': '#472F3F',
    '--sidebar-accent-foreground': '#F9BF8F',
    '--sidebar-border': 'rgba(249, 191, 143, 0.16)',
    '--sidebar-ring': '#E2424A',
} as React.CSSProperties;

export function AppSidebar() {
    const { auth } = usePage<{ auth?: { user?: { rol?: string } } }>().props;
    const esAdmin = auth?.user?.rol === 'administrador';

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
        ...(esAdmin
            ? [
                  {
                      title: 'Usuarios',
                      url: '/usuarios',
                      icon: Users,
                  },
              ]
            : []),
    ];

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
                            <Link href={route('dashboard')} prefetch>
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
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
