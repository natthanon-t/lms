"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  Award,
  BarChart3,
  BookOpen,
  ChevronRight,
  FileCheck2,
  Home,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type NavItem = {
  name: string;
  href: string;
  icon: LucideIcon;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

type SidebarProps = {
  pathname?: string;
  onNavigate?: (href: string) => void;
  className?: string;
  points?: number;
};

const navGroups: NavGroup[] = [
  {
    title: "General",
    items: [
      { name: "Dashboard", href: "/", icon: Home },
      { name: "Learning", href: "/learning", icon: BookOpen },
      { name: "Team", href: "/team", icon: Users },
    ],
  },
  {
    title: "Assessment",
    items: [
      { name: "Exams", href: "/exams", icon: FileCheck2 },
      { name: "Progress", href: "/progress", icon: BarChart3 },
      { name: "Compliance", href: "/compliance", icon: ShieldCheck },
    ],
  },
  {
    title: "Settings",
    items: [{ name: "Preferences", href: "/settings", icon: Settings }],
  },
];

function PointsBadge({ points = 1280 }: { points?: number }) {
  return (
    <div className="rounded-xl border border-blue-100/80 bg-gradient-to-r from-blue-50 to-cyan-50 p-3 shadow-sm dark:border-violet-500/30 dark:from-violet-500/15 dark:to-purple-500/10">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-700/90 dark:text-purple-200/90">
        Team Points
      </p>
      <div className="mt-1 flex items-center justify-between">
        <span className="text-xl font-bold text-slate-900 dark:text-white">{points.toLocaleString()}</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-white/85 px-2 py-1 text-xs font-semibold text-cyan-700 shadow-sm dark:bg-slate-900/70 dark:text-violet-200">
          <Award className="h-3.5 w-3.5" /> +24
        </span>
      </div>
    </div>
  );
}

export default function Sidebar({ pathname, onNavigate, className = "", points = 1280 }: SidebarProps) {
  const currentPath = useMemo(() => {
    if (pathname) return pathname;
    if (typeof window !== "undefined") return window.location.pathname;
    return "/";
  }, [pathname]);

  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const listContainerRef = useRef<HTMLDivElement | null>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<CSSProperties>({ opacity: 0 });

  useEffect(() => {
    const updateIndicator = () => {
      const activeElement = itemRefs.current[currentPath];
      const container = listContainerRef.current;
      if (!activeElement || !container) {
        setIndicatorStyle({ opacity: 0 });
        return;
      }

      const itemRect = activeElement.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      setIndicatorStyle({
        top: itemRect.top - containerRect.top,
        height: itemRect.height,
        opacity: 1,
      });
    };

    updateIndicator();
    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
  }, [currentPath]);

  const handleNavigate = (href: string) => {
    if (onNavigate) {
      onNavigate(href);
      return;
    }
    if (typeof window !== "undefined") {
      window.location.href = href;
    }
  };

  return (
    <aside className={`group fixed left-0 top-1/2 z-40 hidden -translate-y-1/2 md:block ${className}`}>
      <div className="relative w-64 -translate-x-full transform transition-transform duration-300 ease-out group-hover:translate-x-0">
        <div className="absolute inset-0 rounded-r-2xl bg-white/95 backdrop-blur-md shadow-[0_18px_45px_rgba(15,23,42,0.18)] dark:bg-slate-900/95 dark:shadow-[0_18px_55px_rgba(76,29,149,0.3)]" />
        <div className="absolute inset-0 rounded-r-2xl border border-blue-100/80 dark:border-violet-500/30" />

        <button
          type="button"
          aria-label="Open sidebar"
          className="absolute right-[-14px] top-1/2 z-20 h-20 w-3 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-blue-600 to-cyan-500 shadow-md dark:from-purple-600 dark:to-violet-500"
        />

        <div className="relative z-10 flex h-[78vh] min-h-[560px] flex-col p-4">
          <div className="mb-4 border-b border-slate-200/80 pb-4 dark:border-slate-700/80">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">LMS Console</p>
            <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">Management</h2>
          </div>

          <div ref={listContainerRef} className="relative flex-1 overflow-y-auto pr-1">
            <div
              className="pointer-events-none absolute left-0 right-0 z-0 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 shadow-[0_8px_24px_rgba(8,145,178,0.28)] transition-all duration-500 ease-out dark:from-purple-600 dark:to-violet-500 dark:shadow-[0_10px_26px_rgba(124,58,237,0.35)]"
              style={indicatorStyle}
            />

            <nav className="relative z-10 space-y-5 pb-2">
              {navGroups.map((group) => (
                <div key={group.title}>
                  <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    {group.title}
                  </p>

                  <ul className="space-y-1">
                    {group.items.map((item) => {
                      const isActive = currentPath === item.href;
                      const Icon = item.icon;

                      return (
                        <li key={item.href}>
                          <button
                            ref={(node) => {
                              itemRefs.current[item.href] = node;
                            }}
                            type="button"
                            onClick={() => handleNavigate(item.href)}
                            className={`group/item relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-300 ${
                              isActive
                                ? "text-white"
                                : "text-slate-700 hover:translate-x-1 hover:text-blue-600 dark:text-slate-200 dark:hover:text-purple-300"
                            }`}
                          >
                            <Icon
                              className={`h-[18px] w-[18px] shrink-0 transition-transform duration-300 ${
                                isActive ? "scale-105" : "group-hover/item:scale-110"
                              }`}
                            />
                            <span className="text-sm font-medium">{item.name}</span>
                            <ChevronRight
                              className={`ml-auto h-4 w-4 transition-all duration-300 ${
                                isActive
                                  ? "opacity-100"
                                  : "translate-x-[-2px] opacity-0 group-hover/item:translate-x-0 group-hover/item:opacity-100"
                              }`}
                            />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </nav>
          </div>

          <div className="mt-4 border-t border-slate-200/80 pt-4 dark:border-slate-700/80">
            <PointsBadge points={points} />
          </div>
        </div>
      </div>
    </aside>
  );
}
