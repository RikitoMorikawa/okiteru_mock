"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api-client";
import { AttendanceRecord, DailyReport, User } from "@/types/database";
import { getTodayJST } from "../../utils/dateUtils";

interface StaffDataRecord {
  user: User;
  attendanceRecords: AttendanceRecord[];
  dailyReports: DailyReport[];
}

export default function DataManagement() {
  const [staffData, setStaffData] = useState<StaffDataRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = getTodayJST();
    return today;
  });
  const [selectedStaff, setSelectedStaff] = useState<string>("all");

  useEffect(() => {
    fetchStaffData();
  }, [selectedDate, selectedStaff]);

  // Force reset to today's date on component mount
  useEffect(() => {
    const today = getTodayJST();
    if (selectedDate !== today) {
      setSelectedDate(today);
    }
  }, []);

  const fetchStaffData = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        date: selectedDate,
        staffId: selectedStaff,
      });

      const response = await api.get(`/api/admin/staff-data?${params}`);

      if (response.ok) {
        const data = await response.json();
        setStaffData(data.staffData || []);
      } else {
        console.error("Failed to fetch staff data");
        setStaffData([]);
      }
    } catch (error) {
      console.error("Error fetching staff data:", error);
      setStaffData([]);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return "未報告";
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { label: "待機中", color: "bg-yellow-100 text-yellow-800" },
      partial: { label: "部分完了", color: "bg-blue-100 text-blue-800" },
      complete: { label: "完了", color: "bg-green-100 text-green-800" },
      draft: { label: "下書き", color: "bg-gray-100 text-gray-800" },
      submitted: { label: "提出済み", color: "bg-green-100 text-green-800" },
    };

    const statusInfo = statusMap[status as keyof typeof statusMap] || { label: status, color: "bg-gray-100 text-gray-800" };

    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusInfo.color}`}>{statusInfo.label}</span>;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">スタッフデータ管理</h3>
        <div className="flex space-x-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">日付</label>
            <div className="flex space-x-2">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
              <button
                onClick={() => {
                  const today = getTodayJST();
                  setSelectedDate(today);
                }}
                className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                title="今日にリセット"
              >
                今日
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">スタッフ</label>
            <select value={selectedStaff} onChange={(e) => setSelectedStaff(e.target.value)} className="border border-gray-300 rounded-md px-3 py-2 text-sm">
              <option value="all">全スタッフ</option>
              {staffData.map((record) => (
                <option key={record.user.id} value={record.user.id}>
                  {record.user.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {staffData.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="mb-4">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">スタッフが登録されていません</h3>
          <p className="text-sm text-gray-500">スタッフを登録してから、勤怠データを確認できます</p>
        </div>
      ) : (
        <div className="space-y-6">
          {staffData.map((record) => (
            <div key={record.user.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-lg font-medium text-gray-900">{record.user.name}</h4>
                <span className="text-sm text-gray-500">{record.user.email}</span>
              </div>

              {/* Attendance Records */}
              <div className="mb-4">
                <h5 className="text-sm font-medium text-gray-700 mb-2">出勤記録</h5>
                {record.attendanceRecords.length === 0 ? (
                  <div className="bg-gray-50 rounded-md p-4 text-center">
                    <div className="text-gray-400 mb-2">
                      <svg className="mx-auto h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-500 mb-1">まだ勤怠報告がありません</p>
                    <p className="text-xs text-gray-400">{selectedDate}の記録待ち</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {record.attendanceRecords.map((attendance) => (
                      <div key={attendance.id} className="bg-gray-50 rounded-md p-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium">出勤記録</span>
                          {getStatusBadge(attendance.status)}
                        </div>
                        <div className="space-y-2 text-xs text-gray-600">
                          {/* Wake Up */}
                          {attendance.wake_up_time && (
                            <div className="border-l-2 border-green-300 pl-2">
                              <div className="font-medium text-green-700">起床: {formatTime(attendance.wake_up_time)}</div>

                              {attendance.wake_up_notes && <div>💭 {attendance.wake_up_notes}</div>}
                            </div>
                          )}

                          {/* Departure */}
                          {attendance.departure_time && (
                            <div className="border-l-2 border-blue-300 pl-2">
                              <div className="font-medium text-blue-700">出発: {formatTime(attendance.departure_time)}</div>

                              {attendance.departure_notes && <div>💭 {attendance.departure_notes}</div>}
                            </div>
                          )}

                          {/* Arrival */}
                          {attendance.arrival_time && (
                            <div className="border-l-2 border-purple-300 pl-2">
                              <div className="font-medium text-purple-700">到着: {formatTime(attendance.arrival_time)}</div>
                              {attendance.arrival_location && <div>🏢 {attendance.arrival_location}</div>}
                              {attendance.arrival_gps_location && <div>📍 GPS: {attendance.arrival_gps_location}</div>}
                              {attendance.arrival_notes && <div>💭 {attendance.arrival_notes}</div>}
                            </div>
                          )}
                        </div>
                        {(attendance.route_photo_url || attendance.appearance_photo_url) && (
                          <div className="mt-2 text-xs text-blue-600">
                            {attendance.route_photo_url && <div>📷 経路写真あり</div>}
                            {attendance.appearance_photo_url && <div>📷 身だしなみ写真あり</div>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Daily Reports */}
              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-2">日報</h5>
                {record.dailyReports.length === 0 ? (
                  <div className="bg-gray-50 rounded-md p-4 text-center">
                    <div className="text-gray-400 mb-2">
                      <svg className="mx-auto h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-500 mb-1">まだ日報が提出されていません</p>
                    <p className="text-xs text-gray-400">{selectedDate}の日報待ち</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {record.dailyReports.map((report) => (
                      <div key={report.id} className="bg-gray-50 rounded-md p-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium">日報</span>
                          {getStatusBadge(report.status)}
                        </div>
                        <div className="text-sm text-gray-700 mb-2">
                          {report.content.length > 100 ? `${report.content.substring(0, 100)}...` : report.content}
                        </div>
                        <div className="text-xs text-gray-500">
                          {report.status === "submitted" && report.submitted_at && <div>提出日時: {new Date(report.submitted_at).toLocaleString("ja-JP")}</div>}
                          <div>更新日時: {new Date(report.updated_at).toLocaleString("ja-JP")}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
