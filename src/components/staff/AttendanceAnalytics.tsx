"use client";

import { AttendanceRecord, DailyReport } from "@/types/database";

interface AttendanceAnalyticsProps {
  attendanceData: AttendanceRecord[];
  reportsData: DailyReport[];
  dateRange: number;
}

export default function AttendanceAnalytics({ attendanceData, reportsData, dateRange }: AttendanceAnalyticsProps) {
  // Calculate analytics
  const calculateAnalytics = () => {
    const totalDays = dateRange;
    const attendanceDays = new Set(attendanceData.map((record) => record.date)).size;
    const completedDays = attendanceData.filter((record) => record.status === "complete").length;
    const partialDays = attendanceData.filter((record) => record.status === "partial").length;
    const submittedReports = reportsData.filter((report) => report.status === "submitted").length;

    // Calculate average times
    const wakeUpTimes = attendanceData
      .filter((record) => record.wake_up_time)
      .map((record) => {
        const time = new Date(record.wake_up_time!);
        return time.getHours() * 60 + time.getMinutes();
      });

    const departureTimes = attendanceData
      .filter((record) => record.departure_time)
      .map((record) => {
        const time = new Date(record.departure_time!);
        return time.getHours() * 60 + time.getMinutes();
      });

    const arrivalTimes = attendanceData
      .filter((record) => record.arrival_time)
      .map((record) => {
        const time = new Date(record.arrival_time!);
        return time.getHours() * 60 + time.getMinutes();
      });

    const avgWakeUp = wakeUpTimes.length > 0 ? Math.round(wakeUpTimes.reduce((sum, time) => sum + time, 0) / wakeUpTimes.length) : null;
    const avgDeparture = departureTimes.length > 0 ? Math.round(departureTimes.reduce((sum, time) => sum + time, 0) / departureTimes.length) : null;
    const avgArrival = arrivalTimes.length > 0 ? Math.round(arrivalTimes.reduce((sum, time) => sum + time, 0) / arrivalTimes.length) : null;

    // Calculate consistency (standard deviation)
    const calculateConsistency = (times: number[]) => {
      if (times.length < 2) return null;
      const avg = times.reduce((sum, time) => sum + time, 0) / times.length;
      const variance = times.reduce((sum, time) => sum + Math.pow(time - avg, 2), 0) / times.length;
      return Math.sqrt(variance);
    };

    const wakeUpConsistency = calculateConsistency(wakeUpTimes);
    const departureConsistency = calculateConsistency(departureTimes);
    const arrivalConsistency = calculateConsistency(arrivalTimes);

    // Weekly patterns
    const weeklyPattern = Array(7)
      .fill(0)
      .map(() => ({ count: 0, completed: 0 }));
    attendanceData.forEach((record) => {
      const dayOfWeek = new Date(record.date).getDay();
      weeklyPattern[dayOfWeek].count++;
      if (record.status === "complete") {
        weeklyPattern[dayOfWeek].completed++;
      }
    });

    // Monthly trends (if data spans multiple months)
    const monthlyTrends = new Map<string, { count: number; completed: number }>();
    attendanceData.forEach((record) => {
      const monthKey = record.date.substring(0, 7); // YYYY-MM
      if (!monthlyTrends.has(monthKey)) {
        monthlyTrends.set(monthKey, { count: 0, completed: 0 });
      }
      const trend = monthlyTrends.get(monthKey)!;
      trend.count++;
      if (record.status === "complete") {
        trend.completed++;
      }
    });

    return {
      totalDays,
      attendanceDays,
      completedDays,
      partialDays,
      submittedReports,
      attendanceRate: Math.round((attendanceDays / totalDays) * 100),
      completionRate: attendanceDays > 0 ? Math.round((completedDays / attendanceDays) * 100) : 0,
      reportSubmissionRate: Math.round((submittedReports / totalDays) * 100),
      averageTimes: {
        wakeUp: avgWakeUp,
        departure: avgDeparture,
        arrival: avgArrival,
      },
      consistency: {
        wakeUp: wakeUpConsistency,
        departure: departureConsistency,
        arrival: arrivalConsistency,
      },
      weeklyPattern,
      monthlyTrends: Array.from(monthlyTrends.entries()).sort(),
    };
  };

  const formatTime = (minutes: number | null) => {
    if (minutes === null) return "--:--";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
  };

  const formatConsistency = (stdDev: number | null) => {
    if (stdDev === null) return "データ不足";
    if (stdDev < 15) return "非常に安定";
    if (stdDev < 30) return "安定";
    if (stdDev < 60) return "やや不安定";
    return "不安定";
  };

  const analytics = calculateAnalytics();
  const dayNames = ["日", "月", "火", "水", "木", "金", "土"];

  return (
    <div className="space-y-8">
      {/* Overview Metrics */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">概要指標</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="出勤率"
            value={`${analytics.attendanceRate}%`}
            subtitle={`${analytics.attendanceDays}/${analytics.totalDays}日`}
            color={analytics.attendanceRate >= 80 ? "green" : analytics.attendanceRate >= 60 ? "yellow" : "red"}
          />
          <MetricCard
            title="完了率"
            value={`${analytics.completionRate}%`}
            subtitle={`${analytics.completedDays}/${analytics.attendanceDays}日`}
            color={analytics.completionRate >= 80 ? "green" : analytics.completionRate >= 60 ? "yellow" : "red"}
          />
          <MetricCard
            title="日報提出率"
            value={`${analytics.reportSubmissionRate}%`}
            subtitle={`${analytics.submittedReports}/${analytics.totalDays}日`}
            color={analytics.reportSubmissionRate >= 80 ? "green" : analytics.reportSubmissionRate >= 60 ? "yellow" : "red"}
          />
          <MetricCard title="部分完了" value={`${analytics.partialDays}日`} subtitle="改善の余地あり" color="yellow" />
        </div>
      </div>

      {/* Time Analysis */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">時間分析</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Average Times */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="font-medium text-gray-900 mb-4">平均時間</h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">起床時間</span>
                <span className="text-lg font-medium text-gray-900">{formatTime(analytics.averageTimes.wakeUp)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">出発時間</span>
                <span className="text-lg font-medium text-gray-900">{formatTime(analytics.averageTimes.departure)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">到着時間</span>
                <span className="text-lg font-medium text-gray-900">{formatTime(analytics.averageTimes.arrival)}</span>
              </div>
            </div>
          </div>

          {/* Consistency Analysis */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="font-medium text-gray-900 mb-4">時間の安定性</h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">起床時間</span>
                <span
                  className={`text-sm font-medium ${analytics.consistency.wakeUp && analytics.consistency.wakeUp < 30 ? "text-green-600" : "text-yellow-600"}`}
                >
                  {formatConsistency(analytics.consistency.wakeUp)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">出発時間</span>
                <span
                  className={`text-sm font-medium ${
                    analytics.consistency.departure && analytics.consistency.departure < 30 ? "text-green-600" : "text-yellow-600"
                  }`}
                >
                  {formatConsistency(analytics.consistency.departure)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">到着時間</span>
                <span
                  className={`text-sm font-medium ${
                    analytics.consistency.arrival && analytics.consistency.arrival < 30 ? "text-green-600" : "text-yellow-600"
                  }`}
                >
                  {formatConsistency(analytics.consistency.arrival)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Pattern */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">曜日別パターン</h3>
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="grid grid-cols-7 gap-4">
            {analytics.weeklyPattern.map((pattern, index) => {
              const rate = pattern.count > 0 ? Math.round((pattern.completed / pattern.count) * 100) : 0;
              return (
                <div key={index} className="text-center">
                  <div className="text-sm font-medium text-gray-900 mb-2">{dayNames[index]}</div>
                  <div className="mb-2">
                    <div
                      className={`w-full h-20 rounded-lg flex items-end justify-center ${
                        rate >= 80 ? "bg-green-100" : rate >= 60 ? "bg-yellow-100" : rate > 0 ? "bg-red-100" : "bg-gray-100"
                      }`}
                    >
                      <div
                        className={`w-full rounded-lg ${rate >= 80 ? "bg-green-500" : rate >= 60 ? "bg-yellow-500" : rate > 0 ? "bg-red-500" : "bg-gray-400"}`}
                        style={{ height: `${Math.max(rate, 5)}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-600">
                    {pattern.completed}/{pattern.count}
                  </div>
                  <div className="text-xs font-medium text-gray-900">{rate}%</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Monthly Trends */}
      {analytics.monthlyTrends.length > 1 && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">月別トレンド</h3>
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="space-y-4">
              {analytics.monthlyTrends.map(([month, trend]) => {
                const rate = trend.count > 0 ? Math.round((trend.completed / trend.count) * 100) : 0;
                return (
                  <div key={month} className="flex items-center">
                    <div className="w-20 text-sm text-gray-600">{new Date(month + "-01").toLocaleDateString("ja-JP", { year: "numeric", month: "short" })}</div>
                    <div className="flex-1 mx-4">
                      <div className="w-full bg-gray-200 rounded-full h-4">
                        <div
                          className={`h-4 rounded-full ${rate >= 80 ? "bg-green-500" : rate >= 60 ? "bg-yellow-500" : "bg-red-500"}`}
                          style={{ width: `${rate}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="w-16 text-right">
                      <div className="text-sm font-medium text-gray-900">{rate}%</div>
                      <div className="text-xs text-gray-500">
                        {trend.completed}/{trend.count}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Recommendations */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">改善提案</h3>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="space-y-3">
            {analytics.attendanceRate < 80 && (
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-500 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <p className="text-sm font-medium text-blue-800">出勤率の改善</p>
                  <p className="text-sm text-blue-700">出勤率が{analytics.attendanceRate}%です。目標の80%以上を目指しましょう。</p>
                </div>
              </div>
            )}

            {analytics.completionRate < 80 && analytics.partialDays > 0 && (
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-500 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <p className="text-sm font-medium text-blue-800">報告の完全性向上</p>
                  <p className="text-sm text-blue-700">{analytics.partialDays}日間で部分的な報告がありました。すべての項目を報告するよう心がけましょう。</p>
                </div>
              </div>
            )}

            {analytics.consistency.wakeUp && analytics.consistency.wakeUp > 60 && (
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-500 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <p className="text-sm font-medium text-blue-800">起床時間の安定化</p>
                  <p className="text-sm text-blue-700">起床時間にばらつきがあります。規則正しい生活リズムを心がけましょう。</p>
                </div>
              </div>
            )}

            {analytics.reportSubmissionRate < 80 && (
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-500 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <p className="text-sm font-medium text-blue-800">日報提出率の向上</p>
                  <p className="text-sm text-blue-700">日報提出率が{analytics.reportSubmissionRate}%です。毎日の日報提出を習慣化しましょう。</p>
                </div>
              </div>
            )}

            {analytics.attendanceRate >= 80 && analytics.completionRate >= 80 && analytics.reportSubmissionRate >= 80 && (
              <div className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <p className="text-sm font-medium text-green-800">優秀な勤務態度</p>
                  <p className="text-sm text-green-700">すべての指標で良好な結果を示しています。この調子を維持しましょう。</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  subtitle: string;
  color: "green" | "yellow" | "red" | "blue";
}

function MetricCard({ title, value, subtitle, color }: MetricCardProps) {
  const colorClasses = {
    green: "bg-green-50 text-green-600 border-green-200",
    yellow: "bg-yellow-50 text-yellow-600 border-yellow-200",
    red: "bg-red-50 text-red-600 border-red-200",
    blue: "bg-blue-50 text-blue-600 border-blue-200",
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm p-6 border-l-4 ${colorClasses[color]}`}>
      <div className="text-center">
        <p className="text-sm font-medium text-gray-600 mb-2">{title}</p>
        <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </div>
    </div>
  );
}
