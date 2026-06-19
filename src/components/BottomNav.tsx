'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Clock, Calendar, Trophy, User, Settings } from 'lucide-react';

interface BottomNavProps {
  isAdmin: boolean;
}

export default function BottomNav({ isAdmin }: BottomNavProps) {
  const pathname = usePathname();

  // Don't show bottom nav on login page
  if (pathname === '/login') return null;

  const navItems = [
    { name: 'Today', href: '/', icon: Clock },
    { name: 'Fixtures', href: '/fixtures', icon: Calendar },
    { name: 'Standings', href: '/standings', icon: Trophy },
    { name: 'Profile', href: '/profile', icon: User },
  ];

  if (isAdmin) {
    navItems.push({ name: 'Admin', href: '/admin', icon: Settings });
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-950/80 border-t border-slate-800 backdrop-blur-lg flex justify-around items-center h-16 max-w-xl mx-auto px-2">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
        return (
          <Link
            key={item.name}
            href={item.href}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-all ${
              isActive ? 'text-amber-500 font-black scale-105' : 'text-slate-500 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100'
            }`}
          >
            <Icon className="w-5 h-5 mb-1" />
            <span className="text-[10px] tracking-wider uppercase">{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
