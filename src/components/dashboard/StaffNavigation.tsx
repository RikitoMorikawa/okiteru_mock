"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import LogoutButton from "@/components/auth/LogoutButton";
import { useState } from "react";

const navigationItems = [
  {
    name: "ダッシュボード",
    href: "/dashboard",
    icon: "🏠",
    description: "概要とステータス",
  },
  {
    name: "勤怠報告",
    href: "/dashboard/attendance",
    icon: "⏰",
    description: "起床・出発・到着報告",
  },
  {
    name: "日報提出",
    href: "/dashboard/reports",
    icon: "📝",
    description: "業務報告書作成",
  },
  // {
  //   name: "シフト管理",
  //   href: "/dashboard/shifts",
  //   icon: "📅",
  //   description: "シフト予定提出",
  // },
  {
    name: "プロフィール",
    href: "/profile",
    icon: "👤",
    description: "個人情報設定",
  },
];

export default function StaffNavigation() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden lg:block bg-white rounded-lg shadow-sm p-4">
        {/* User Info */}
        <div className="mb-6 pb-4 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-semibold text-lg">{user?.name?.charAt(0) || "U"}</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-500">スタッフ</p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="space-y-2">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                  ${isActive ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700" : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"}
                `}
              >
                <span className="mr-3 text-lg">{item.icon}</span>
                <div className="flex-1">
                  <div className="font-medium">{item.name}</div>
                  <div className="text-xs text-gray-500 group-hover:text-gray-700">{item.description}</div>
                </div>
                {isActive && <div className="w-2 h-2 bg-blue-600 rounded-full"></div>}
              </Link>
            );
          })}
        </div>

        {/* Logout */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <LogoutButton className="w-full justify-center" />
        </div>
      </nav>

      {/* Mobile Navigation */}
      <div className="lg:hidden">
        {/* Mobile Menu Button */}
        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="fixed bottom-4 left-4 z-50 bg-white rounded-md p-2 shadow-lg border border-gray-200">
          <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>

        {/* Mobile Menu Overlay */}
        {isMenuOpen && <div className="fixed inset-0 z-40 bg-black bg-opacity-50" onClick={() => setIsMenuOpen(false)} />}

        {/* Mobile Menu */}
        <div
          className={`fixed top-0 left-0 z-40 w-80 h-full bg-white shadow-xl transform transition-transform duration-300 ease-in-out ${
            isMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="p-4 pt-16">
            {/* User Info */}
            <div className="mb-6 pb-4 border-b border-gray-200">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold text-lg">{user?.name?.charAt(0) || "U"}</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-500">スタッフ</p>
                </div>
              </div>
            </div>

            {/* Navigation Items */}
            <div className="space-y-2">
              {navigationItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    className={`
                      group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                      ${isActive ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700" : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"}
                    `}
                  >
                    <span className="mr-3 text-lg">{item.icon}</span>
                    <div className="flex-1">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-gray-500 group-hover:text-gray-700">{item.description}</div>
                    </div>
                    {isActive && <div className="w-2 h-2 bg-blue-600 rounded-full"></div>}
                  </Link>
                );
              })}
            </div>

            {/* Logout */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <LogoutButton className="w-full justify-center" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
