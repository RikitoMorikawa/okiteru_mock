"use client";

import Link from "next/link";

interface AttendanceStatus {
  wakeUpReported: boolean;
  departureReported: boolean;
  arrivalReported: boolean;
  dailyReportSubmitted: boolean;
  shiftScheduleSubmitted: boolean;
}

interface QuickActionsProps {
  attendanceStatus: AttendanceStatus;
}

export default function QuickActions({ attendanceStatus }: QuickActionsProps) {
  const getNextAction = () => {
    if (!attendanceStatus.wakeUpReported) {
      return {
        title: "起床報告",
        description: "起床時間を報告してください",
        href: "/dashboard/attendance?action=wakeup",
        icon: "🌅",
        priority: "high",
      };
    }

    if (!attendanceStatus.departureReported) {
      return {
        title: "出発報告",
        description: "出発時間と経路写真をアップロード",
        href: "/dashboard/attendance?action=departure",
        icon: "🚗",
        priority: "high",
      };
    }

    if (!attendanceStatus.arrivalReported) {
      return {
        title: "到着報告",
        description: "到着時間と身だしなみ写真をアップロード",
        href: "/dashboard/attendance?action=arrival",
        icon: "🏢",
        priority: "high",
      };
    }

    if (!attendanceStatus.dailyReportSubmitted) {
      return {
        title: "日報作成",
        description: "本日の業務内容を報告",
        href: "/dashboard/reports",
        icon: "📝",
        priority: "medium",
      };
    }

    // if (!attendanceStatus.shiftScheduleSubmitted) {
    //   return {
    //     title: "シフト提出",
    //     description: "来週のシフト予定を提出",
    //     href: "/dashboard/shifts",
    //     icon: "📅",
    //     priority: "low",
    //   };
    // }

    return null;
  };

  const nextAction = getNextAction();

  const quickActionItems = [
    {
      title: "起床報告",
      href: "/dashboard/attendance?action=wakeup",
      icon: "🌅",
      completed: attendanceStatus.wakeUpReported,
    },
    {
      title: "出発報告",
      href: "/dashboard/attendance?action=departure",
      icon: "🚗",
      completed: attendanceStatus.departureReported,
    },
    {
      title: "到着報告",
      href: "/dashboard/attendance?action=arrival",
      icon: "🏢",
      completed: attendanceStatus.arrivalReported,
    },
    {
      title: "日報作成",
      href: "/dashboard/reports",
      icon: "📝",
      completed: attendanceStatus.dailyReportSubmitted,
    },
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "border-red-200 bg-red-50";
      case "medium":
        return "border-yellow-200 bg-yellow-50";
      case "low":
        return "border-blue-200 bg-blue-50";
      default:
        return "border-gray-200 bg-gray-50";
    }
  };

  return (
    <div className="mb-6">
      {/* Next Action Card */}
      {nextAction && (
        <div className={`rounded-lg border-2 p-4 mb-4 ${getPriorityColor(nextAction.priority)}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-2xl mr-3">{nextAction.icon}</span>
              <div>
                <h3 className="font-semibold text-gray-900">次のアクション: {nextAction.title}</h3>
                <p className="text-sm text-gray-600">{nextAction.description}</p>
              </div>
            </div>
            <Link href={nextAction.href} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium">
              開始
            </Link>
          </div>
        </div>
      )}

      {/* All Actions Complete */}
      {!nextAction && (
        <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4 mb-4">
          <div className="flex items-center">
            <span className="text-2xl mr-3">🎉</span>
            <div>
              <h3 className="font-semibold text-green-900">本日のタスク完了</h3>
              <p className="text-sm text-green-700">お疲れ様でした！本日の全ての報告が完了しています。</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Action Buttons */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">クイックアクション</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActionItems.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className={`
                relative p-3 rounded-lg border-2 transition-all hover:shadow-md
                ${item.completed ? "border-green-200 bg-green-50 text-green-700" : "border-gray-200 bg-white text-gray-700 hover:border-blue-300"}
              `}
            >
              <div className="text-center">
                <div className="text-2xl mb-2">{item.icon}</div>
                <div className="text-sm font-medium">{item.title}</div>
                {item.completed && (
                  <div className="absolute top-1 right-1">
                    <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
