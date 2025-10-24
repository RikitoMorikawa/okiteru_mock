"use client";

import { useState } from "react";
import { ShiftSchedule, User } from "@/types/database";

interface ShiftWithStaff extends ShiftSchedule {
  staff: User;
}

interface ShiftApprovalQueueProps {
  shifts: ShiftWithStaff[];
  onApproval: (shiftId: string, action: "approve" | "reject") => Promise<void>;
}

export default function ShiftApprovalQueue({ shifts, onApproval }: ShiftApprovalQueueProps) {
  const [processingShifts, setProcessingShifts] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<"date" | "staff" | "created">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [selectedShifts, setSelectedShifts] = useState<Set<string>>(new Set());

  // Sort shifts
  const getSortedShifts = () => {
    const sorted = [...shifts].sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case "date":
          aValue = new Date(a.date).getTime();
          bValue = new Date(b.date).getTime();
          break;
        case "staff":
          aValue = a.staff.name;
          bValue = b.staff.name;
          break;
        case "created":
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        default:
          return 0;
      }

      if (typeof aValue === "string") {
        return sortOrder === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      } else {
        return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
      }
    });

    return sorted;
  };

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const handleSingleApproval = async (shiftId: string, action: "approve" | "reject") => {
    setProcessingShifts((prev) => new Set(prev).add(shiftId));
    try {
      await onApproval(shiftId, action);
    } finally {
      setProcessingShifts((prev) => {
        const newSet = new Set(prev);
        newSet.delete(shiftId);
        return newSet;
      });
    }
  };

  const handleBulkApproval = async (action: "approve" | "reject") => {
    const shiftsToProcess = Array.from(selectedShifts);
    setProcessingShifts((prev) => {
      const newSet = new Set(prev);
      shiftsToProcess.forEach((id) => newSet.add(id));
      return newSet;
    });

    try {
      await Promise.all(shiftsToProcess.map((shiftId) => onApproval(shiftId, action)));
      setSelectedShifts(new Set());
    } finally {
      setProcessingShifts((prev) => {
        const newSet = new Set(prev);
        shiftsToProcess.forEach((id) => newSet.delete(id));
        return newSet;
      });
    }
  };

  const toggleShiftSelection = (shiftId: string) => {
    setSelectedShifts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(shiftId)) {
        newSet.delete(shiftId);
      } else {
        newSet.add(shiftId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedShifts.size === shifts.length) {
      setSelectedShifts(new Set());
    } else {
      setSelectedShifts(new Set(shifts.map((shift) => shift.id)));
    }
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ja-JP", {
      month: "short",
      day: "numeric",
      weekday: "short",
    });
  };

  const sortedShifts = getSortedShifts();

  if (shifts.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">✅</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">承認待ちのシフトはありません</h3>
        <p className="text-gray-600">すべてのシフトが承認済みです。</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header with bulk actions */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-medium text-gray-900">承認待ちシフト ({shifts.length}件)</h3>
          {selectedShifts.size > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">{selectedShifts.size}件選択中</span>
              <button
                onClick={() => handleBulkApproval("approve")}
                disabled={processingShifts.size > 0}
                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
              >
                一括承認
              </button>
              <button
                onClick={() => handleBulkApproval("reject")}
                disabled={processingShifts.size > 0}
                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
              >
                一括却下
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Shifts Table */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedShifts.size === shifts.length && shifts.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th
                onClick={() => handleSort("staff")}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                <div className="flex items-center">
                  スタッフ
                  {sortBy === "staff" && (
                    <svg className={`w-4 h-4 ml-1 ${sortOrder === "desc" ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  )}
                </div>
              </th>
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">時間</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">勤務場所</th>
              <th
                onClick={() => handleSort("created")}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                <div className="flex items-center">
                  申請日時
                  {sortBy === "created" && (
                    <svg className={`w-4 h-4 ml-1 ${sortOrder === "desc" ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  )}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">アクション</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedShifts.map((shift) => (
              <tr key={shift.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedShifts.has(shift.id)}
                    onChange={() => toggleShiftSelection(shift.id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-gray-600">{shift.staff.name.charAt(0)}</span>
                    </div>
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900">{shift.staff.name}</div>
                      <div className="text-sm text-gray-500">{shift.staff.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{formatDate(shift.date)}</div>
                  <div className="text-xs text-gray-500">{new Date(shift.date).toLocaleDateString("ja-JP", { year: "numeric" })}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {(() => {
                      const start = new Date(`2000-01-01T${shift.start_time}`);
                      const end = new Date(`2000-01-01T${shift.end_time}`);
                      const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                      return `${duration}時間`;
                    })()}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{shift.location || "指定なし"}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {new Date(shift.created_at).toLocaleDateString("ja-JP", {
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(shift.created_at).toLocaleTimeString("ja-JP", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleSingleApproval(shift.id, "approve")}
                      disabled={processingShifts.has(shift.id)}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                    >
                      {processingShifts.has(shift.id) ? (
                        <svg className="animate-spin -ml-1 mr-1 h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                      ) : (
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      承認
                    </button>
                    <button
                      onClick={() => handleSingleApproval(shift.id, "reject")}
                      disabled={processingShifts.has(shift.id)}
                      className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      却下
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Shift Details */}
      {sortedShifts.some((shift) => shift.notes) && (
        <div className="mt-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">備考・詳細</h4>
          <div className="space-y-3">
            {sortedShifts
              .filter((shift) => shift.notes)
              .map((shift) => (
                <div key={shift.id} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">
                      {shift.staff.name} - {formatDate(shift.date)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{shift.notes}</p>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
