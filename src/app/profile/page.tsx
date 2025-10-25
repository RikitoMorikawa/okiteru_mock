"use client";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import LogoutButton from "@/components/auth/LogoutButton";
import UserProfile from "@/components/profile/UserProfile";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";

export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center space-x-4">
                <Link href="/dashboard" className="text-base sm:text-xl font-semibold text-gray-900 hover:text-gray-700">
                  スタッフ管理システム
                </Link>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700">
                  {user?.name} ({user?.role === "manager" ? "管理者" : "スタッフ"})
                </span>
                <LogoutButton />
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">プロフィール設定</h1>
            </div>

            <UserProfile editable={true} />

            <div className="mt-6">
              <Link
                href="/dashboard"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                ← ダッシュボードに戻る
              </Link>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
