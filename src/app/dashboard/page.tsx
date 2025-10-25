"use client";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import LogoutButton from "@/components/auth/LogoutButton";
import StaffRegistrationForm from "@/components/auth/StaffRegistrationForm";
import StaffDashboard from "@/components/dashboard/StaffDashboard";
import DataManagement from "@/components/dashboard/DataManagement";
import { ManagerOnly, StaffOnly } from "@/components/ui/RoleBasedRender";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import { useState, useEffect } from "react";

export default function DashboardPage() {
  const { user } = useAuth();
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);
  const [activeTab, setActiveTab] = useState<"overview" | "data">("overview");

  return (
    <ProtectedRoute>
      {/* Manager Dashboard */}
      <ManagerOnly>
        <div className="min-h-screen bg-gray-50">
          <nav className="bg-white shadow">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16">
                <div className="flex items-center">
                  <h1 className="text-base sm:text-xl font-semibold text-gray-900">スタッフ管理システム</h1>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="hidden sm:block text-xs sm:text-sm text-gray-600">
                    {currentTime.toLocaleString("ja-JP", {
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  <Link href="/profile" className="hidden sm:block text-xs sm:text-sm text-gray-700 hover:text-gray-900">
                    プロフィール
                  </Link>
                  <span className="hidden sm:block text-xs sm:text-sm text-gray-700">
                    {user?.name} ({user?.role === "manager" ? "管理者" : "スタッフ"})
                  </span>
                  <LogoutButton />
                </div>
              </div>
            </div>
          </nav>

          <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <div className="px-4 py-6 sm:px-0">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">管理者ダッシュボード</h2>

                {/* Tab Navigation */}
                <div className="border-b border-gray-200 mb-6">
                  <nav className="-mb-px flex space-x-8">
                    <button
                      onClick={() => setActiveTab("overview")}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${
                        activeTab === "overview"
                          ? "border-indigo-500 text-indigo-600"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      概要
                    </button>
                    <button
                      onClick={() => setActiveTab("data")}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${
                        activeTab === "data"
                          ? "border-indigo-500 text-indigo-600"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      データ管理
                    </button>
                  </nav>
                </div>

                {/* Tab Content */}
                {activeTab === "overview" && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                      <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="p-5">
                          <div className="flex items-center">
                            <div className="flex-shrink-0">
                              <div className="w-8 h-8 bg-indigo-500 rounded-md flex items-center justify-center">
                                <span className="text-white text-sm font-medium">👥</span>
                              </div>
                            </div>
                            <div className="ml-5 w-0 flex-1">
                              <dl>
                                <dt className="text-sm font-medium text-gray-500 truncate">スタッフ管理</dt>
                                <dd className="text-lg font-medium text-gray-900">新しいスタッフを追加</dd>
                              </dl>
                            </div>
                          </div>
                        </div>
                        <div className="bg-gray-50 px-5 py-3">
                          <button onClick={() => setShowStaffForm(!showStaffForm)} className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                            {showStaffForm ? "フォームを閉じる" : "スタッフを追加"}
                          </button>
                        </div>
                      </div>

                      <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="p-5">
                          <div className="flex items-center">
                            <div className="flex-shrink-0">
                              <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                                <span className="text-white text-sm font-medium">📊</span>
                              </div>
                            </div>
                            <div className="ml-5 w-0 flex-1">
                              <dl>
                                <dt className="text-sm font-medium text-gray-500 truncate">勤怠管理</dt>
                                <dd className="text-lg font-medium text-gray-900">後のタスクで実装</dd>
                              </dl>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="p-5">
                          <div className="flex items-center">
                            <div className="flex-shrink-0">
                              <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                                <span className="text-white text-sm font-medium">🔔</span>
                              </div>
                            </div>
                            <div className="ml-5 w-0 flex-1">
                              <dl>
                                <dt className="text-sm font-medium text-gray-500 truncate">アラート</dt>
                                <dd className="text-lg font-medium text-gray-900">後のタスクで実装</dd>
                              </dl>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {showStaffForm && (
                      <div className="mb-6">
                        <StaffRegistrationForm
                          onSuccess={() => {
                            setShowStaffForm(false);
                            // Could add a success message here
                          }}
                          onCancel={() => setShowStaffForm(false)}
                        />
                      </div>
                    )}

                    {/* Common placeholder for future features */}
                    <div className="border-4 border-dashed border-gray-200 rounded-lg p-8 text-center">
                      <p className="text-gray-600">詳細なマネージャー機能は後のタスクで実装されます</p>
                    </div>
                  </>
                )}

                {activeTab === "data" && <DataManagement />}
              </div>
            </div>
          </main>
        </div>
      </ManagerOnly>

      {/* Staff Dashboard */}
      <StaffOnly>
        <StaffDashboard />
      </StaffOnly>
    </ProtectedRoute>
  );
}
