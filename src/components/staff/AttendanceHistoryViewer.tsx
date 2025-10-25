"use client";

import { useState } from "react";
import { AttendanceRecord } from "@/types/database";

interface AttendanceHistoryViewerProps {
  attendanceData: AttendanceRecord[];
  staffId: string;
  dateRange: number;
}

export default function AttendanceHistoryViewer({ attendanceData, staffId, dateRange }: AttendanceHistoryViewerProps) {
  const [statusFilter, setStatusFilter] = useState<"all" | "complete" | "partial" | "pending">("all");
  const [sortBy, setSortBy] = useState<"date" | "wake_up" | "departure" | "arrival">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [viewMode, setViewMode] = useState<"table" | "calendar">("table");

  // Filter and sort attendance data
  const getFilteredAndSortedData = () => {
    let filtered = [...attendanceData];

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((record) => record.status === statusFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case "date":
          aValue = new Date(a.date).getTime();
          bValue = new Date(b.date).getTime();
          break;
        case "wake_up":
          aValue = a.wake_up_time ? new Date(a.wake_up_time).getTime() : 0;
          bValue = b.wake_up_time ? new Date(b.wake_up_time).getTime() : 0;
          break;
        case "departure":
          aValue = a.departure_time ? new Date(a.departure_time).getTime() : 0;
          bValue = b.departure_time ? new Date(b.departure_time).getTime() : 0;
          break;
        case "arrival":
          aValue = a.arrival_time ? new Date(a.arrival_time).getTime() : 0;
          bValue = b.arrival_time ? new Date(b.arrival_time).getTime() : 0;
          break;
        default:
          return 0;
      }

      return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
    });

    return filtered;
  };

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return "--:--";
    return new Date(timeString).toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: AttendanceRecord["status"]) => {
    const badges = {
      complete: "bg-green-100 text-green-800",
      partial: "bg-yellow-100 text-yellow-800",
      pending: "bg-gray-100 text-gray-800",
      active: "bg-blue-100 text-blue-800",
      reset: "bg-red-100 text-red-800",
    };

    const labels = {
      complete: "完了",
      partial: "部分的",
      pending: "未完了",
      active: "進行中",
      reset: "リセット",
    };

    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${badges[status]}`}>{labels[status]}</span>;
  };

  const getCompletionScore = (record: AttendanceRecord) => {
    let score = 0;
    if (record.wake_up_time) score++;
    if (record.departure_time) score++;
    if (record.arrival_time) score++;
    return score;
  };

  const filteredData = getFilteredAndSortedData();

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 space-y-4 lg:space-y-0">
        <div className="flex items-center space-x-4">
          <div>
            <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
              ステータス
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="all">すべて</option>
              <option value="complete">完了</option>
              <option value="partial">部分的</option>
              <option value="pending">未完了</option>
            </select>
          </div>

          <div>
            <label htmlFor="view-mode" className="block text-sm font-medium text-gray-700 mb-1">
              表示形式
            </label>
            <select
              id="view-mode"
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as any)}
              className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="table">テーブル</option>
              <option value="calendar">カレンダー</option>
            </select>
          </div>
        </div>

        <div className="text-sm text-gray-600">
          {filteredData.length}件の記録 (過去{dateRange}日間)
        </div>
      </div>

      {viewMode === "table" ? (
        /* Table View */
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  onClick={() => handleSort("date")}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  <div className="flex items-center">
                    日付
                    {sortBy === "date" && (
                      <svg className={`w-4 h-4 ml-1 ${sortOrder === "desc" ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("wake_up")}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  <div className="flex items-center">
                    起床時間
                    {sortBy === "wake_up" && (
                      <svg className={`w-4 h-4 ml-1 ${sortOrder === "desc" ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("departure")}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  <div className="flex items-center">
                    出発時間
                    {sortBy === "departure" && (
                      <svg className={`w-4 h-4 ml-1 ${sortOrder === "desc" ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("arrival")}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  <div className="flex items-center">
                    到着時間
                    {sortBy === "arrival" && (
                      <svg className={`w-4 h-4 ml-1 ${sortOrder === "desc" ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">写真</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ステータス</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">進捗</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {new Date(record.date).toLocaleDateString("ja-JP", {
                        month: "short",
                        day: "numeric",
                        weekday: "short",
                      })}
                    </div>
                    <div className="text-xs text-gray-500">{new Date(record.date).toLocaleDateString("ja-JP", { year: "numeric" })}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatTime(record.wake_up_time)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatTime(record.departure_time)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatTime(record.arrival_time)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {record.route_photo_url && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">経路</span>
                      )}
                      {record.appearance_photo_url && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">身だしなみ</span>
                      )}
                      {!record.route_photo_url && !record.appearance_photo_url && <span className="text-xs text-gray-400">なし</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(record.status)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="text-sm text-gray-900">{getCompletionScore(record)}/3</div>
                      <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            record.status === "complete" ? "bg-green-500" : record.status === "partial" ? "bg-yellow-500" : "bg-gray-400"
                          }`}
                          style={{ width: `${(getCompletionScore(record) / 3) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredData.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-4">📅</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">勤怠記録が見つかりません</h3>
              <p>{statusFilter !== "all" ? "フィルター条件を変更してください" : "選択した期間内に勤怠記録がありません"}</p>
            </div>
          )}
        </div>
      ) : (
        /* Calendar View */
        <AttendanceCalendarView attendanceData={filteredData} />
      )}
    </div>
  );
}

// Calendar View Component
function AttendanceCalendarView({ attendanceData }: { attendanceData: AttendanceRecord[] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Create a map of dates to attendance records
  const attendanceMap = new Map<string, AttendanceRecord>();
  attendanceData.forEach((record) => {
    attendanceMap.set(record.date, record);
  });

  // Generate calendar days
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    const current = new Date(startDate);

    for (let i = 0; i < 42; i++) {
      const dateStr = current.toISOString().split("T")[0];
      const attendance = attendanceMap.get(dateStr);
      const isCurrentMonth = current.getMonth() === month;

      days.push({
        date: new Date(current),
        dateStr,
        attendance,
        isCurrentMonth,
      });

      current.setDate(current.getDate() + 1);
    }

    return days;
  };

  const days = generateCalendarDays();
  const monthNames = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];

  const navigateMonth = (direction: "prev" | "next") => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + (direction === "next" ? 1 : -1));
    setCurrentMonth(newMonth);
  };

  const getStatusColor = (attendance?: AttendanceRecord) => {
    if (!attendance) return "bg-gray-50";
    switch (attendance.status) {
      case "complete":
        return "bg-green-100 border-green-300";
      case "partial":
        return "bg-yellow-100 border-yellow-300";
      case "pending":
        return "bg-red-100 border-red-300";
      default:
        return "bg-gray-50";
    }
  };

  return (
    <div>
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-gray-900">
          {currentMonth.getFullYear()}年 {monthNames[currentMonth.getMonth()]}
        </h3>
        <div className="flex space-x-2">
          <button onClick={() => navigateMonth("prev")} className="p-2 text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button onClick={() => setCurrentMonth(new Date())} className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800">
            今月
          </button>
          <button onClick={() => navigateMonth("next")} className="p-2 text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 mb-4">
        {["日", "月", "火", "水", "木", "金", "土"].map((day) => (
          <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => (
          <div key={index} className={`min-h-[80px] p-2 border border-gray-200 ${getStatusColor(day.attendance)} ${!day.isCurrentMonth ? "opacity-50" : ""}`}>
            <div className="text-sm font-medium text-gray-900 mb-1">{day.date.getDate()}</div>
            {day.attendance && (
              <div className="space-y-1">
                <div className="text-xs text-gray-600">
                  {day.attendance.wake_up_time && (
                    <div>起: {new Date(day.attendance.wake_up_time).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}</div>
                  )}
                  {day.attendance.departure_time && (
                    <div>出: {new Date(day.attendance.departure_time).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}</div>
                  )}
                  {day.attendance.arrival_time && (
                    <div>到: {new Date(day.attendance.arrival_time).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}</div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-6 flex items-center justify-center space-x-6 text-sm">
        <div className="flex items-center">
          <div className="w-4 h-4 bg-green-100 border border-green-300 rounded mr-2"></div>
          <span>完了</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded mr-2"></div>
          <span>部分的</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-red-100 border border-red-300 rounded mr-2"></div>
          <span>未完了</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-gray-50 border border-gray-200 rounded mr-2"></div>
          <span>記録なし</span>
        </div>
      </div>
    </div>
  );
}
