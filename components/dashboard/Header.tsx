'use client';

import React from 'react';
import { useTheme } from 'next-themes';
import { useSession, signOut } from 'next-auth/react';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';
import {
  Search,
  Bell,
  Sun,
  Moon,
  Menu,
  User,
  LogOut,
  Settings,
  ChevronDown,
} from 'lucide-react';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { Tooltip } from '@/components/ui/Tooltip';
import { SearchBar } from './SearchBar';

export function Header() {
  const { theme, setTheme } = useTheme();
  const { setMobileSidebarOpen } = useAppStore();
  const { data: session } = useSession();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const userInitial =
    session?.user?.name?.[0]?.toUpperCase() ||
    session?.user?.email?.[0]?.toUpperCase() ||
    '?';

  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex items-center justify-between gap-4',
        'h-[var(--sv-header-height)] px-4 md:px-6',
        'bg-sv-bg/80 backdrop-blur-md border-b border-sv-border'
      )}
    >
      {/* Left section */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileSidebarOpen(true)}
          className="p-2 rounded-lg text-sv-text-muted hover:text-sv-text-primary hover:bg-sv-surface-hover transition-colors lg:hidden cursor-pointer"
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Desktop Search */}
        <div className="hidden md:block flex-1 max-w-xl ml-4">
          <SearchBar />
        </div>
      </div>

      <div className="flex items-center gap-3 ml-auto">
        {/* Theme toggle */}
        {mounted && (
          <Tooltip content={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2.5 rounded-lg text-sv-text-muted hover:text-sv-text-primary hover:bg-sv-surface-hover transition-colors cursor-pointer"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>
          </Tooltip>
        )}

        {/* Notifications */}
        <Tooltip content="Notifications">
          <button
            className="p-2.5 rounded-lg text-sv-text-muted hover:text-sv-text-primary hover:bg-sv-surface-hover transition-colors relative cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
          </button>
        </Tooltip>

        {/* User menu */}
        <DropdownMenu
          trigger={
            <button
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-sv-surface-hover transition-colors cursor-pointer"
              aria-label="User menu"
            >
              <div className="h-8 w-8 rounded-full bg-sv-accent/20 flex items-center justify-center text-sm font-bold text-sv-accent">
                {userInitial}
              </div>
              {session?.user?.email && (
                <span className="hidden md:block text-xs text-sv-text-muted max-w-[140px] truncate">
                  {session.user.email}
                </span>
              )}
              <ChevronDown className="h-3.5 w-3.5 text-sv-text-muted hidden md:block" />
            </button>
          }
          items={[
            ...(session?.user?.name
              ? [
                  {
                    label: session.user.name,
                    icon: <User className="h-4 w-4" />,
                    onClick: () => {},
                    disabled: true,
                  } as const,
                  'separator' as const,
                ]
              : []),
            {
              label: 'Settings',
              icon: <Settings className="h-4 w-4" />,
              onClick: () => {},
            },
            'separator',
            {
              label: 'Sign out',
              icon: <LogOut className="h-4 w-4" />,
              onClick: () => signOut({ callbackUrl: '/login' }),
              variant: 'danger',
            },
          ]}
        />
      </div>
    </header>
  );
}
