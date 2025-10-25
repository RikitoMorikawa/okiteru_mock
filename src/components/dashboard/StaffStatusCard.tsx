"use client";

import { useState } from "react";
import { User, AttendanceRecord, DailyReport, Alert } from "@/types/database";

interface StaffWithStatus extends User {
  todayAttendance?: AttendanceRecord;
  todayReport?: DailyReport;
  activeAlerts: Alert[];
  lastLogin?: string;
}

interface StaffStatusCardProps {
  staff: StaffWithStatus;
}

export default function StaffStatusCard({ staff }: StaffStatusCardProps) {
  const [expanded, setExpanded] = useState(false);

  // Calculate completion status
  const getCompletionStatus = () => {
    const tasks = [
      { name: "起床報告", completed: !!staff.todayAttendance?.wake_up_time },
      { name: "出発報告", completed: !!staff.todayAttendance?.departure_time },
      { name: "到着報告", completed: !!staff.todayAttendance?.arrival_time },
      { name: "日報提出", completed: staff.todayReport?.status === "submitted" },
    ];

    const completed = tasks.filter((task) => task.completed).length;
    const total = tasks.length;
    const percentage = Math.round((completed / total) * 100);

    return { tasks, completed, total, percentage };
  };

  // Get overall status
  const getOverallStatus = () => {
    const { percentage } = getCompletionStatus();
    const hasAlerts = staff.activeAlerts.length > 0;

    if (hasAlerts) return { status: "alert", label: "要注意", color: "red" };
    if (percentage === 100) return { status: "complete", label: "完了", color: "green" };
    if (percentage > 0) return { status: "partial", label: "進行中", color: "yellow" };
    return { status: "inactive", label: "未開始", color: "gray" };
  };

  // Format time
  const formatTime = (timeString?: string) => {
    if (!timeString) return "--:--";
    return new Date(timeString).toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Format last login
  const formatLastLogin = (loginTime?: string) => {
    if (!loginTime) return "未ログイン";
    const date = new Date(loginTime);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return "1分以内";
    if (diffMinutes < 60) return `${diffMinutes}分前`;
    if (diffHours < 24) {
      const remainingMinutes = diffMinutes % 60;
      if (remainingMinutes === 0) {
        return `${diffHours}時間前`;
      } else {
        return `${diffHours}時間${remainingMinutes}分前`;
      }
    }
    if (diffDays < 7) return `${diffDays}日前`;

    // 1週間以上前は日付を表示
    return date.toLocaleDateString("ja-JP", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const { tasks, completed, total, percentage } = getCompletionStatus();
  const { status, label, color } = getOverallStatus();

  const statusColors = {
    red: "bg-red-100 text-red-800 border-red-200",
    green: "bg-green-100 text-green-800 border-green-200",
    yellow: "bg-yellow-100 text-yellow-800 border-yellow-200",
    gray: "bg-gray-100 text-gray-800 border-gray-200",
  };

  const borderColors = {
    red: "border-red-300",
    green: "border-green-300",
    yellow: "border-yellow-300",
    gray: "border-gray-300",
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border-l-4 ${borderColors[color as keyof typeof borderColors]} hover:shadow-md transition-shadow`}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-gray-600">{staff.name.charAt(0)}</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-gray-900">{staff.name}</h3>
              <p className="text-xs text-gray-500">{staff.email}</p>
            </div>
          </div>
          <div className={`px-2 py-1 rounded-full text-xs font-medium border ${statusColors[color as keyof typeof statusColors]}`}>{label}</div>
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>本日の進捗</span>
            <span>
              {completed}/{total}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                color === "green" ? "bg-green-500" : color === "yellow" ? "bg-yellow-500" : color === "red" ? "bg-red-500" : "bg-gray-400"
              }`}
              style={{ width: `${percentage}%` }}
            ></div>
          </div>
        </div>

        {/* Alerts */}
        {staff.activeAlerts.length > 0 && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center">
              <svg className="w-4 h-4 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-sm font-medium text-red-800">{staff.activeAlerts.length}件のアラート</span>
            </div>
          </div>
        )}

        {/* Quick Status */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">起床</div>
            <div className="text-sm font-medium">{formatTime(staff.todayAttendance?.wake_up_time)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">出発</div>
            <div className="text-sm font-medium">{formatTime(staff.todayAttendance?.departure_time)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">到着</div>
            <div className="text-sm font-medium">{formatTime(staff.todayAttendance?.arrival_time)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">日報</div>
            <div className="text-sm font-medium">{staff.todayReport?.status === "submitted" ? "提出済" : "未提出"}</div>
          </div>
        </div>

        {/* Expand/Collapse Button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center justify-center"
        >
          {expanded ? "詳細を閉じる" : "詳細を表示"}
          <svg className={`w-4 h-4 ml-1 transform transition-transform ${expanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Expanded Details */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            {/* Task Details */}
            <div className="space-y-2 mb-4">
              {tasks.map((task, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{task.name}</span>
                  <div className="flex items-center">
                    {task.completed ? (
                      <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    ) : (
                      <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Additional Info */}
            <div className="text-xs text-gray-500 space-y-1">
              <div>最終ログイン: {formatLastLogin(staff.lastLogin)}</div>
              {staff.phone && <div>電話: {staff.phone}</div>}
            </div>

            {/* Active Alerts Details */}
            {staff.activeAlerts.length > 0 && (
              <div className="mt-3">
                <div className="text-xs font-medium text-gray-700 mb-2">アクティブアラート:</div>
                <div className="space-y-1">
                  {staff.activeAlerts.map((alert) => (
                    <div key={alert.id} className="text-xs text-red-600 bg-red-50 p-2 rounded">
                      {alert.message}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-4 flex space-x-2">
              <button className="flex-1 px-3 py-2 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100">
                履歴表示
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
