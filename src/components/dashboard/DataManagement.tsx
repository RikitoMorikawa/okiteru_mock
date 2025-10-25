"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api-client";
import { AttendanceRecord, DailyReport, User } from "@/types/database";

interface StaffDataRecord {
  user: User;
  attendanceRecords: AttendanceRecord[];
  dailyReports: DailyReport[];
}

export default function DataManagement() {
  const [staffData, setStaffData] = useState<StaffDataRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedStaff, setSelectedStaff] = useState<string>("all");

  useEffect(() => {
    fetchStaffData();
  }, [selectedDate, selectedStaff]);

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
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
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
          <p>選択した条件でのデータが見つかりません</p>
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
                  <p className="text-sm text-gray-500">出勤記録なし</p>
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
                  <p className="text-sm text-gray-500">日報なし</p>
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
