"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import StaffNavigation from "./StaffNavigation";
import StatusIndicator from "./StatusIndicator";
import QuickActions from "./QuickActions";

interface AttendanceStatus {
  wakeUpReported: boolean;
  departureReported: boolean;
  arrivalReported: boolean;
  dailyReportSubmitted: boolean;
  shiftScheduleSubmitted: boolean;
}

export default function StaffDashboard() {
  const { user } = useAuth();
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus>({
    wakeUpReported: false,
    departureReported: false,
    arrivalReported: false,
    dailyReportSubmitted: false,
    shiftScheduleSubmitted: false,
  });
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // TODO: Fetch real attendance status from API
  useEffect(() => {
    // This will be implemented when we create the attendance API
    // For now, we'll use mock data
  }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "おはようございます";
    if (hour < 18) return "こんにちは";
    return "お疲れ様です";
  };

  const getTodayProgress = () => {
    const completed = Object.values(attendanceStatus).filter(Boolean).length;
    const total = Object.keys(attendanceStatus).length;
    return { completed, total, percentage: Math.round((completed / total) * 100) };
  };

  const progress = getTodayProgress();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">ダッシュボード</h1>
            </div>
            <div className="flex items-center space-x-4">
              <StatusIndicator />
              <div className="text-sm text-gray-600">
                {currentTime.toLocaleString("ja-JP", {
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Navigation Sidebar */}
          <div className="lg:col-span-1">
            <StaffNavigation />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Welcome Section */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">

              {/* Progress Bar */}
              <div className="">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>本日のタスク進捗</span>
                  <span>
                    {progress.completed}/{progress.total} 完了
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${progress.percentage}%` }}></div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <QuickActions attendanceStatus={attendanceStatus} />

            {/* Today's Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
              <StatusCard title="起床報告" status={attendanceStatus.wakeUpReported} icon="🌅" description="起床時間を報告" />
              <StatusCard title="出発報告" status={attendanceStatus.departureReported} icon="🚗" description="出発時間と経路写真" />
              <StatusCard title="到着報告" status={attendanceStatus.arrivalReported} icon="🏢" description="到着時間と身だしなみ写真" />
              <StatusCard title="日報提出" status={attendanceStatus.dailyReportSubmitted} icon="📝" description="本日の業務報告" />
              {/* <StatusCard title="シフト提出" status={attendanceStatus.shiftScheduleSubmitted} icon="📅" description="来週のシフト予定" /> */}
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">最近の活動</h3>
              <div className="space-y-3">
                <div className="flex items-center text-sm text-gray-600">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                  <span>システムにログインしました</span>
                  <span className="ml-auto">
                    {currentTime.toLocaleTimeString("ja-JP", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                {/* More activity items will be added when we implement the activity tracking */}
                <div className="text-center py-8 text-gray-500">
                  <p>今日の活動はまだありません</p>
                  <p className="text-sm">報告を開始して進捗を記録しましょう</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatusCardProps {
  title: string;
  status: boolean;
  icon: string;
  description: string;
}

function StatusCard({ title, status, icon, description }: StatusCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-l-gray-200 hover:border-l-blue-500 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <span className="text-2xl mr-3">{icon}</span>
          <div>
            <h4 className="font-medium text-gray-900">{title}</h4>
            <p className="text-sm text-gray-600">{description}</p>
          </div>
        </div>
        <div className="flex-shrink-0">
          {status ? (
            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          ) : (
            <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
