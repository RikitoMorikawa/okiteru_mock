"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

interface DailyReport {
  id: string;
  date: string;
  content: string;
  status: "draft" | "submitted";
  submitted_at?: string;
  created_at: string;
  updated_at: string;
}

export default function ReportHistory() {
  const { user } = useAuth();
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<DailyReport | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "submitted">("all");

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);

      // TODO: Replace with actual API call
      const response = await fetch("/api/reports/daily/history");

      if (response.ok) {
        const data: DailyReport[] = await response.json();
        setReports(data);
      } else {
        // Mock data for now
        const mockReports: DailyReport[] = [
          {
            id: "1",
            date: "2024-01-20",
            content: "本日は新規顧客への営業活動を中心に行いました。午前中は資料作成、午後は3件の訪問を実施。うち1件で好感触を得られました。",
            status: "submitted",
            submitted_at: "2024-01-20T18:30:00Z",
            created_at: "2024-01-20T09:00:00Z",
            updated_at: "2024-01-20T18:30:00Z",
          },
          {
            id: "2",
            date: "2024-01-19",
            content: "システム研修に参加。新機能の使い方を学習しました。",
            status: "draft",
            created_at: "2024-01-19T16:00:00Z",
            updated_at: "2024-01-19T16:30:00Z",
          },
        ];
        setReports(mockReports);
      }
    } catch (error) {
      console.error("Failed to load reports:", error);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = reports.filter((report) => {
    const matchesSearch = report.content.toLowerCase().includes(searchTerm.toLowerCase()) || report.date.includes(searchTerm);
    const matchesStatus = statusFilter === "all" || report.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
    });
  };

  const getStatusBadge = (status: string) => {
    if (status === "submitted") {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">提出済み</span>;
    } else {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">下書き</span>;
    }
  };

  const truncateContent = (content: string, maxLength: number = 100) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + "...";
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
              検索
            </label>
            <input
              type="text"
              id="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="日付や内容で検索..."
            />
          </div>

          {/* Status Filter */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
              ステータス
            </label>
            <select
              id="status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | "draft" | "submitted")}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">すべて</option>
              <option value="submitted">提出済み</option>
              <option value="draft">下書き</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reports List */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">日報履歴 ({filteredReports.length}件)</h3>
        </div>

        {filteredReports.length === 0 ? (
          <div className="p-6 text-center">
            <div className="text-gray-400 text-6xl mb-4">📋</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">日報がありません</h3>
            <p className="text-gray-600">
              {searchTerm || statusFilter !== "all" ? "検索条件に一致する日報が見つかりませんでした" : "まだ日報を作成していません"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredReports.map((report) => (
              <div key={report.id} className="p-6 hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => setSelectedReport(report)}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="text-lg font-medium text-gray-900">{formatDate(report.date)}</h4>
                      {getStatusBadge(report.status)}
                    </div>
                    <p className="text-gray-600 mb-3">{truncateContent(report.content)}</p>
                    <div className="flex items-center text-sm text-gray-500 space-x-4">
                      <span>作成: {new Date(report.created_at).toLocaleString("ja-JP")}</span>
                      {report.submitted_at && <span>提出: {new Date(report.submitted_at).toLocaleString("ja-JP")}</span>}
                    </div>
                  </div>
                  <div className="ml-4">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Report Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{formatDate(selectedReport.date)}</h3>
                  <div className="mt-1">{getStatusBadge(selectedReport.status)}</div>
                </div>
                <button onClick={() => setSelectedReport(null)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-2">報告内容</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <pre className="whitespace-pre-wrap text-sm text-gray-900 font-sans">{selectedReport.content}</pre>
                </div>
              </div>

              {/* Metadata */}
              <div className="border-t border-gray-200 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">作成日時:</span>
                    <br />
                    {new Date(selectedReport.created_at).toLocaleString("ja-JP")}
                  </div>
                  <div>
                    <span className="font-medium">更新日時:</span>
                    <br />
                    {new Date(selectedReport.updated_at).toLocaleString("ja-JP")}
                  </div>
                  {selectedReport.submitted_at && (
                    <div className="md:col-span-2">
                      <span className="font-medium">提出日時:</span>
                      <br />
                      {new Date(selectedReport.submitted_at).toLocaleString("ja-JP")}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setSelectedReport(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
