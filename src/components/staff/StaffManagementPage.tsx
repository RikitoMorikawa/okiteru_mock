"use client";

import { useState } from "react";
import Link from "next/link";
import StaffList from "./StaffList";
import StaffFilters from "../dashboard/StaffFilters";
import { FilterOptions } from "@/types/database";

export default function StaffManagementPage() {
  const [filters, setFilters] = useState<FilterOptions>({
    search: "",
    status: "all",
    sortBy: "name",
    dayView: "today",
  });
  const [viewMode, setViewMode] = useState<"today" | "tomorrow">("today");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/manager" className="text-gray-400 hover:text-gray-600 mr-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-base sm:text-xl font-semibold text-gray-900">スタッフ管理</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/manager/staff/register"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                スタッフ追加
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Page Description */}
        <div className="mb-6">
          <p className="text-gray-600">
            スタッフの詳細情報、勤怠状況、活動履歴を管理できます。 各スタッフの詳細ページでは、リアルタイムの活動状況や過去の履歴を確認できます。
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <StaffFilters filters={filters} onFiltersChange={setFilters} />
        </div>

        {/* Day View Toggle */}
        <div className="mb-6">
          <div className="flex items-center space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
            <button
              onClick={() => setViewMode("today")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                viewMode === "today" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              当日
            </button>
            <button
              onClick={() => setViewMode("tomorrow")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                viewMode === "tomorrow" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              翌日
            </button>
          </div>
        </div>

        {/* Staff List */}
        <StaffList searchQuery={filters.search} statusFilter={filters.status} viewMode={viewMode} />
      </div>
    </div>
  );
}
