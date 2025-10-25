"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { AttendanceRecord, DailyReport } from "@/types/database";
import AttendanceHistoryViewer from "./AttendanceHistoryViewer";
import AttendanceAnalytics from "./AttendanceAnalytics";

interface StaffHistoryPageProps {
  staffId: string;
  staffName: string;
}

export default function StaffHistoryPage({ staffId, staffName }: StaffHistoryPageProps) {
  const [activeTab, setActiveTab] = useState<"attendance" | "reports" | "analytics">("attendance");
  const [dateRange, setDateRange] = useState(30); // Default to 30 days
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [reportsData, setReportsData] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistoryData = async () => {
    try {
      setLoading(true);
      const startDate = new Date(Date.now() - dateRange * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      // Fetch attendance records
      const { data: attendance, error: attendanceError } = await supabase
        .from("attendance_records")
        .select("*")
        .eq("staff_id", staffId)
        .gte("date", startDate)
        .order("date", { ascending: false });

      if (attendanceError) throw attendanceError;

      // Fetch daily reports
      const { data: reports, error: reportsError } = await supabase
        .from("daily_reports")
        .select("*")
        .eq("staff_id", staffId)
        .gte("date", startDate)
        .order("date", { ascending: false });

      if (reportsError) throw reportsError;

      setAttendanceData(attendance || []);
      setReportsData(reports || []);
    } catch (error) {
      console.error("Error fetching history data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistoryData();
  }, [staffId, dateRange]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href={`/manager/staff/${staffId}`} className="text-gray-400 hover:text-gray-600 mr-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-base sm:text-xl font-semibold text-gray-900">{staffName}さんの履歴</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div>
                <label htmlFor="date-range" className="block text-sm font-medium text-gray-700 mb-1">
                  期間
                </label>
                <select
                  id="date-range"
                  value={dateRange}
                  onChange={(e) => setDateRange(Number(e.target.value))}
                  className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value={7}>過去7日間</option>
                  <option value={14}>過去14日間</option>
                  <option value={30}>過去30日間</option>
                  <option value={90}>過去90日間</option>
                  <option value={180}>過去6ヶ月</option>
                  <option value={365}>過去1年間</option>
                </select>
              </div>
              <button
                onClick={fetchHistoryData}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                更新
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">📅</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">勤怠記録日数</p>
                <p className="text-2xl font-semibold text-gray-900">{new Set(attendanceData.map((record) => record.date)).size}日</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-green-500">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">✅</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">完了記録</p>
                <p className="text-2xl font-semibold text-gray-900">{attendanceData.filter((record) => record.status === "complete").length}件</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-purple-500">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">📝</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">提出済み日報</p>
                <p className="text-2xl font-semibold text-gray-900">{reportsData.filter((report) => report.status === "submitted").length}件</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-yellow-500">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">📊</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">出勤率</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {dateRange > 0 ? Math.round((new Set(attendanceData.map((record) => record.date)).size / dateRange) * 100) : 0}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {[
                { id: "attendance", label: "勤怠履歴", icon: "📅" },
                { id: "reports", label: "日報履歴", icon: "📝" },
                { id: "analytics", label: "分析・レポート", icon: "📊" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">データを読み込み中...</span>
              </div>
            ) : (
              <>
                {activeTab === "attendance" && <AttendanceHistoryViewer attendanceData={attendanceData} staffId={staffId} dateRange={dateRange} />}
                {activeTab === "reports" && <ReportsHistoryViewer reportsData={reportsData} staffId={staffId} dateRange={dateRange} />}
                {activeTab === "analytics" && <AttendanceAnalytics attendanceData={attendanceData} reportsData={reportsData} dateRange={dateRange} />}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Reports History Viewer Component
function ReportsHistoryViewer({ reportsData, staffId, dateRange }: { reportsData: DailyReport[]; staffId: string; dateRange: number }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "submitted" | "draft">("all");

  const filteredReports = reportsData.filter((report) => {
    const matchesSearch = report.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || report.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-4 sm:space-y-0">
        <div className="flex-1 max-w-md">
          <input
            type="text"
            placeholder="日報内容を検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-3 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value="all">すべて</option>
            <option value="submitted">提出済み</option>
            <option value="draft">下書き</option>
          </select>
        </div>
      </div>

      {/* Reports List */}
      <div className="space-y-4">
        {filteredReports.map((report) => (
          <div key={report.id} className="border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <span className="text-lg font-medium text-gray-900">
                  {new Date(report.date).toLocaleDateString("ja-JP", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    weekday: "short",
                  })}
                </span>
                <span
                  className={`ml-3 px-2 py-1 text-xs font-medium rounded-full ${
                    report.status === "submitted" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {report.status === "submitted" ? "提出済み" : "下書き"}
                </span>
              </div>
              {report.status === "submitted" && (
                <span className="text-sm text-gray-500">提出日時: {new Date(report.submitted_at).toLocaleString("ja-JP")}</span>
              )}
            </div>
            <div className="prose prose-sm max-w-none">
              <p className="text-gray-700 whitespace-pre-wrap">{report.content}</p>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <span className="text-xs text-gray-500">作成日時: {new Date(report.created_at).toLocaleString("ja-JP")}</span>
            </div>
          </div>
        ))}

        {filteredReports.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-4">📝</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">日報が見つかりません</h3>
            <p>{searchQuery || statusFilter !== "all" ? "検索条件を変更してください" : "選択した期間内に日報がありません"}</p>
          </div>
        )}
      </div>
    </div>
  );
}
