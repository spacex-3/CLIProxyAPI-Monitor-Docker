"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  FileText,
  Activity,
  LogOut,
  Github,
  ExternalLink,
  Table,
  Radio,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { Modal } from "./Modal";

const links = [
  { href: "/", label: "仪表盘", icon: BarChart3 },
  { href: "/explore", label: "数据探索", icon: Activity },
  { href: "/channels", label: "渠道统计", icon: Radio },
  { href: "/records", label: "调用记录", icon: Table },
  { href: "/logs", label: "日志", icon: FileText },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const [usageStatsEnabled, setUsageStatsEnabled] = useState<boolean | null>(null);
  const [usageStatsLoading, setUsageStatsLoading] = useState(false);
  const [showUsageConfirm, setShowUsageConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [cpamcLink, setCpamcLink] = useState<string | null>(null);

  const loadToggle = useCallback(async () => {
    setUsageStatsLoading(true);
    try {
      const res = await fetch("/api/usage-statistics-enabled", { cache: "no-store" });
      if (!res.ok) throw new Error("load failed");
      const data = await res.json();
      setUsageStatsEnabled(Boolean(data["usage-statistics-enabled"]));
    } catch {
      setUsageStatsEnabled(null);
    } finally {
      setUsageStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadToggle();
  }, [loadToggle]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const saved = window.localStorage.getItem("sidebar-collapsed");
    if (saved === "1") setCollapsed(true);

    const onResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setMobileOpen(false);
    };

    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("sidebar-collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    let active = true;
    const loadCpamc = async () => {
      try {
        const res = await fetch("/api/management-url", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!active) return;
        setCpamcLink(typeof data?.url === "string" ? data.url : null);
      } catch {
        if (!active) return;
        setCpamcLink(null);
      }
    };

    loadCpamc();
    return () => {
      active = false;
    };
  }, []);

  const applyUsageToggle = async (nextEnabled: boolean) => {
    setUsageStatsLoading(true);
    try {
      const res = await fetch("/api/usage-statistics-enabled", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: nextEnabled }),
      });
      if (!res.ok) throw new Error("toggle failed");
      const data = await res.json();
      setUsageStatsEnabled(Boolean(data["usage-statistics-enabled"]));
    } catch {
      // ignore
    } finally {
      setUsageStatsLoading(false);
    }
  };

  const handleUsageToggle = () => {
    if (usageStatsEnabled === null) return;
    const nextEnabled = !usageStatsEnabled;
    if (!nextEnabled) {
      setShowUsageConfirm(true);
      return;
    }
    applyUsageToggle(nextEnabled);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      setLoggingOut(false);
    }
  };

  const widthClass = collapsed ? "w-16" : "w-56";

  return (
    <>
      {isMobile && !mobileOpen ? (
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="fixed left-3 top-3 z-50 rounded-lg border border-slate-700 bg-slate-900/90 p-2 text-slate-200 shadow-lg"
          aria-label="打开菜单"
        >
          <PanelLeftOpen className="h-5 w-5" />
        </button>
      ) : null}

      {isMobile && mobileOpen ? (
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/50"
          aria-label="关闭菜单遮罩"
        />
      ) : null}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen ${widthClass} flex-col border-r border-slate-800 bg-slate-950 py-4 transition-all duration-200 ${
          isMobile ? (mobileOpen ? "translate-x-0" : "-translate-x-full") : "translate-x-0"
        }`}
      >
        <div className={collapsed ? "px-2" : "px-5"}>
          <div className="flex items-center justify-between">
            {!collapsed ? (
              <div>
                <h1 className="text-xl font-bold text-white">CLIProxyAPI</h1>
                <p className="text-sm text-slate-500">Usage Dashboard</p>
              </div>
            ) : (
              <h1 className="mx-auto text-sm font-bold text-white">CPA</h1>
            )}

            <div className="flex items-center gap-1">
              {!isMobile ? (
                <button
                  type="button"
                  onClick={() => setCollapsed((v) => !v)}
                  className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                  title={collapsed ? "展开侧栏" : "收起侧栏"}
                >
                  {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                  title="关闭菜单"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        <nav className={`mt-6 flex-1 space-y-1 ${collapsed ? "px-2" : "px-3"}`}>
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center ${collapsed ? "justify-center" : "gap-3"} rounded-lg px-3 py-2.5 text-base font-medium transition-colors ${
                  active ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
                title={collapsed ? label : undefined}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed ? label : null}
              </Link>
            );
          })}

          {cpamcLink ? (
            <a
              href={cpamcLink}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center ${collapsed ? "justify-center" : "gap-3"} rounded-lg px-3 py-2.5 text-base font-medium transition-colors text-slate-400 hover:bg-slate-800 hover:text-white`}
              title={collapsed ? "前往 CPAMC" : undefined}
            >
              <ExternalLink className="h-5 w-5" />
              {!collapsed ? "前往 CPAMC" : null}
            </a>
          ) : null}
        </nav>

        <div className={`mt-auto border-t border-slate-800 ${collapsed ? "px-2" : "px-4"} pt-3 pb-2 space-y-3`}>
          <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between"}`}>
            {!collapsed ? (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Activity className="h-4 w-4" />
                上游使用统计
              </div>
            ) : null}
            <button
              onClick={handleUsageToggle}
              disabled={usageStatsLoading || usageStatsEnabled === null}
              className={`rounded-full px-3 py-1 text-sm font-semibold transition ${
                usageStatsEnabled ? "bg-emerald-600 text-white" : "border border-slate-600 text-slate-400"
              } ${usageStatsLoading ? "opacity-70" : ""}`}
              title={collapsed ? "上游使用统计开关" : undefined}
            >
              {usageStatsLoading ? "..." : usageStatsEnabled ? "ON" : "OFF"}
            </button>
          </div>

          <div className={`flex items-center ${collapsed ? "justify-center" : "gap-2"}`}>
            <a
              href="https://github.com/sxjeru/CLIProxyAPI-Monitor"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center rounded-lg border border-slate-700 p-2 text-slate-500 transition hover:bg-slate-800 hover:text-slate-300"
              title="GitHub"
            >
              <Github className="h-4 w-4" />
            </a>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className={`${collapsed ? "ml-1" : "flex-1"} flex items-center justify-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:opacity-50`}
              title={collapsed ? "退出登录" : undefined}
            >
              <LogOut className="h-4 w-4" />
              {!collapsed ? (loggingOut ? "退出中..." : "退出登录") : null}
            </button>
          </div>
        </div>

        <Modal
          isOpen={showUsageConfirm}
          onClose={() => setShowUsageConfirm(false)}
          title="关闭上游使用统计？"
          darkMode={true}
          className="bg-slate-900 ring-1 ring-slate-700"
          backdropClassName="bg-black/60"
        >
          <p className="mt-2 text-sm text-slate-400">关闭后将停止 CLIProxyAPI 记录使用数据，需要时可再次开启。</p>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setShowUsageConfirm(false)}
              className="flex-1 rounded-lg border border-slate-600 px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
            >
              取消
            </button>
            <button
              type="button"
              onClick={() => {
                setShowUsageConfirm(false);
                applyUsageToggle(false);
              }}
              className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-500"
              disabled={usageStatsLoading}
            >
              确认关闭
            </button>
          </div>
        </Modal>
      </aside>
    </>
  );
}
