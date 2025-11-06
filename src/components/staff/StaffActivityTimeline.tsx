"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { AttendanceRecord, DailyReport } from "@/types/database";

interface TimelineEvent {
  id: string;
  type: "login" | "logout" | "wake_up" | "departure" | "arrival" | "report_draft" | "report_submit" | "alert";
  timestamp: string;
  title: string;
  description: string;
  icon: string;
  color: "blue" | "green" | "yellow" | "red" | "gray" | "purple";
  metadata?: any;
}

interface StaffActivityTimelineProps {
  staffId: string;
}

export default function StaffActivityTimeline({ staffId }: StaffActivityTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState(7); // Default to 7 days
  const [filter, setFilter] = useState<"all" | "attendance" | "reports" | "system">("all");

  const fetchTimelineEvents = async () => {
    try {
      setLoading(true);
      const startDate = new Date(Date.now() - dateRange * 24 * 60 * 60 * 1000).toISOString();

      // Fetch attendance records
      const { data: attendanceRecords, error: attendanceError } = await supabase
        .from("attendance_records")
        .select("*")
        .eq("staff_id", staffId)
        .gte("created_at", startDate)
        .order("created_at", { ascending: false });

      if (attendanceError) throw attendanceError;

      // Fetch daily reports
      const { data: dailyReports, error: reportsError } = await supabase
        .from("daily_reports")
        .select("*")
        .eq("staff_id", staffId)
        .gte("created_at", startDate)
        .order("created_at", { ascending: false });

      if (reportsError) throw reportsError;

      // Fetch alerts
      const { data: alerts, error: alertsError } = await supabase
        .from("alerts")
        .select("*")
        .eq("staff_id", staffId)
        .gte("triggered_at", startDate)
        .order("triggered_at", { ascending: false });

      if (alertsError) throw alertsError;

      // Fetch access logs
      const { data: accessLogs, error: logsError } = await supabase
        .from("access_logs")
        .select("*")
        .eq("user_id", staffId)
        .gte("login_time", startDate)
        .order("login_time", { ascending: false });

      if (logsError) throw logsError;

      // Convert data to timeline events
      const timelineEvents: TimelineEvent[] = [];

      // Process attendance records
      ((attendanceRecords as AttendanceRecord[]) || []).forEach((record) => {
        if (record.wake_up_time) {
          timelineEvents.push({
            id: `wake_up_${record.id}`,
            type: "wake_up",
            timestamp: record.wake_up_time,
            title: "起床報告",
            description: `起床時間: ${new Date(record.wake_up_time).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}`,
            icon: "🌅",
            color: "blue",
            metadata: { recordId: record.id, date: record.date },
          });
        }

        if (record.departure_time) {
          timelineEvents.push({
            id: `departure_${record.id}`,
            type: "departure",
            timestamp: record.departure_time,
            title: "出発報告",
            description: `出発時間: ${new Date(record.departure_time).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}${
              record.route_photo_url ? " (経路写真あり)" : ""
            }`,
            icon: "🚗",
            color: "yellow",
            metadata: { recordId: record.id, date: record.date, hasPhoto: !!record.route_photo_url },
          });
        }

        if (record.arrival_time) {
          timelineEvents.push({
            id: `arrival_${record.id}`,
            type: "arrival",
            timestamp: record.arrival_time,
            title: "到着報告",
            description: `到着時間: ${new Date(record.arrival_time).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}${
              record.appearance_photo_url ? " (身だしなみ写真あり)" : ""
            }`,
            icon: "🏢",
            color: "green",
            metadata: { recordId: record.id, date: record.date, hasPhoto: !!record.appearance_photo_url },
          });
        }
      });

      // Process daily reports
      ((dailyReports as DailyReport[]) || []).forEach((report) => {
        if (report.status === "draft") {
          timelineEvents.push({
            id: `report_draft_${report.id}`,
            type: "report_draft",
            timestamp: report.created_at,
            title: "日報下書き保存",
            description: `日報の下書きを保存しました (${new Date(report.date).toLocaleDateString("ja-JP")})`,
            icon: "📝",
            color: "gray",
            metadata: { reportId: report.id, date: report.date },
          });
        } else if (report.status === "submitted") {
          timelineEvents.push({
            id: `report_submit_${report.id}`,
            type: "report_submit",
            timestamp: report.submitted_at,
            title: "日報提出",
            description: `日報を提出しました (${new Date(report.date).toLocaleDateString("ja-JP")})`,
            icon: "✅",
            color: "green",
            metadata: { reportId: report.id, date: report.date, content: report.content },
          });
        }
      });

      // Process access logs
      ((accessLogs as any[]) || []).forEach((log) => {
        timelineEvents.push({
          id: `login_${log.id}`,
          type: "login",
          timestamp: log.login_time,
          title: "ログイン",
          description: `システムにログインしました${log.ip_address ? ` (IP: ${log.ip_address})` : ""}`,
          icon: "🔐",
          color: "blue",
          metadata: { logId: log.id, ipAddress: log.ip_address, userAgent: log.user_agent },
        });

        if (log.logout_time) {
          timelineEvents.push({
            id: `logout_${log.id}`,
            type: "logout",
            timestamp: log.logout_time,
            title: "ログアウト",
            description: "システムからログアウトしました",
            icon: "🔓",
            color: "gray",
            metadata: { logId: log.id },
          });
        }
      });

      // Sort events by timestamp (newest first)
      timelineEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setEvents(timelineEvents);
    } catch (error) {
      console.error("Error fetching timeline events:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter events based on selected filter
  const getFilteredEvents = () => {
    if (filter === "all") return events;

    const filterMap = {
      attendance: ["wake_up", "departure", "arrival"],
      reports: ["report_draft", "report_submit"],
      system: ["login", "logout", "alert"],
    };

    return events.filter((event) => filterMap[filter].includes(event.type));
  };

  // Group events by date
  const getGroupedEvents = () => {
    const filtered = getFilteredEvents();
    const grouped: { [date: string]: TimelineEvent[] } = {};

    filtered.forEach((event) => {
      const date = new Date(event.timestamp).toLocaleDateString("ja-JP");
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(event);
    });

    return grouped;
  };

  useEffect(() => {
    fetchTimelineEvents();
  }, [staffId, dateRange]);

  const groupedEvents = getGroupedEvents();
  const eventDates = Object.keys(groupedEvents).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse flex space-x-4">
            <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-4 sm:space-y-0">
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
            </select>
          </div>

          <div>
            <label htmlFor="event-filter" className="block text-sm font-medium text-gray-700 mb-1">
              フィルター
            </label>
            <select
              id="event-filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="all">すべて</option>
              <option value="attendance">勤怠関連</option>
              <option value="reports">報告関連</option>
              <option value="system">システム関連</option>
            </select>
          </div>
        </div>

        <button
          onClick={fetchTimelineEvents}
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

      {/* Timeline */}
      <div className="space-y-8">
        {eventDates.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-4">📅</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">活動履歴がありません</h3>
            <p>選択した期間内に活動履歴が見つかりませんでした。</p>
          </div>
        ) : (
          eventDates.map((date) => (
            <div key={date}>
              {/* Date Header */}
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 w-24">
                  <span className="text-sm font-medium text-gray-900">{date}</span>
                </div>
                <div className="flex-1 h-px bg-gray-200 ml-4"></div>
              </div>

              {/* Events for this date */}
              <div className="relative">
                <div className="absolute left-12 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                <div className="space-y-6">
                  {groupedEvents[date].map((event, index) => (
                    <TimelineEventItem key={event.id} event={event} isLast={index === groupedEvents[date].length - 1} />
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

interface TimelineEventItemProps {
  event: TimelineEvent;
  isLast: boolean;
}

function TimelineEventItem({ event, isLast }: TimelineEventItemProps) {
  const colorClasses = {
    blue: "bg-blue-100 text-blue-600 border-blue-200",
    green: "bg-green-100 text-green-600 border-green-200",
    yellow: "bg-yellow-100 text-yellow-600 border-yellow-200",
    red: "bg-red-100 text-red-600 border-red-200",
    gray: "bg-gray-100 text-gray-600 border-gray-200",
    purple: "bg-purple-100 text-purple-600 border-purple-200",
  };

  return (
    <div className="relative flex items-start">
      {/* Timeline dot */}
      <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs ${colorClasses[event.color]} relative z-10`}>
        <span>{event.icon}</span>
      </div>

      {/* Event content */}
      <div className="ml-6 flex-1">
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-900">{event.title}</h4>
            <span className="text-xs text-gray-500">
              {new Date(event.timestamp).toLocaleTimeString("ja-JP", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          <p className="text-sm text-gray-600">{event.description}</p>

          {/* Additional metadata */}
          {event.metadata && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="text-xs text-gray-500 space-y-1">
                {event.type === "report_submit" && event.metadata.content && (
                  <div>
                    <span className="font-medium">内容:</span>
                    <p className="mt-1 line-clamp-2">{event.metadata.content}</p>
                  </div>
                )}
                {event.metadata.hasPhoto && (
                  <div className="flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    写真添付あり
                  </div>
                )}
                {event.metadata.ipAddress && <div>IP: {event.metadata.ipAddress}</div>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
