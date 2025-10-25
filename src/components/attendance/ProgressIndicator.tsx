"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api-client";

interface AttendanceStatus {
  wakeUpReported: boolean;
  departureReported: boolean;
  arrivalReported: boolean;
  dailyReportSubmitted: boolean;
  dayCompleted?: boolean;
}

interface ProgressIndicatorProps {
  className?: string;
}

export default function ProgressIndicator({ className = "" }: ProgressIndicatorProps) {
  const { user } = useAuth();
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus>({
    wakeUpReported: false,
    departureReported: false,
    arrivalReported: false,
    dailyReportSubmitted: false,
    dayCompleted: false,
  });
  const [loading, setLoading] = useState(true);

  // Fetch attendance status from API
  const fetchAttendanceStatus = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await api.get("/api/attendance/status");

      if (response.ok) {
        const data = await response.json();
        setAttendanceStatus(data.status);
      } else {
        console.error("Failed to fetch attendance status");
      }
    } catch (error) {
      console.error("Error fetching attendance status:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceStatus();
  }, [user]);

  // Listen for attendance updates from other components
  useEffect(() => {
    const handleAttendanceUpdate = () => {
      fetchAttendanceStatus();
    };

    window.addEventListener("attendanceUpdated", handleAttendanceUpdate);
    return () => window.removeEventListener("attendanceUpdated", handleAttendanceUpdate);
  }, []);

  const getTodayProgress = () => {
    const tasks = [
      { name: "起床報告", completed: attendanceStatus.wakeUpReported, icon: "🌅" },
      { name: "出発報告", completed: attendanceStatus.departureReported, icon: "🚗" },
      { name: "到着報告", completed: attendanceStatus.arrivalReported, icon: "🏢" },
      { name: "日報提出", completed: attendanceStatus.dailyReportSubmitted, icon: "📝" },
    ];
    const completed = tasks.filter((task) => task.completed).length;
    const total = tasks.length;
    const percentage = Math.round((completed / total) * 100);

    return { tasks, completed, total, percentage };
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-2 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const progress = getTodayProgress();

  return (
    <div className={`bg-white rounded-lg shadow-sm p-4 border-l-4 border-blue-500 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900">本日のタスク進捗</h3>
        <span className="text-xs text-gray-500">
          {progress.completed}/{progress.total} 完了
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${progress.percentage}%` }}></div>
        </div>
        <div className="text-right mt-1">
          <span className="text-xs font-medium text-blue-600">{progress.percentage}%</span>
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-2">
        {progress.tasks.map((task, index) => (
          <div key={index} className="flex items-center justify-between text-sm">
            <div className="flex items-center">
              <span className="text-lg mr-2">{task.icon}</span>
              <span className={task.completed ? "text-gray-900" : "text-gray-500"}>{task.name}</span>
            </div>
            <div className="flex-shrink-0">
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

      {/* Completion Message */}
      {progress.percentage === 100 && (
        <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center">
            <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-xs font-medium text-green-800">本日のタスクが完了しました！</span>
          </div>
        </div>
      )}
    </div>
  );
}
