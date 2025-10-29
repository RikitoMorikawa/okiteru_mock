"use client";

import { User } from "@/types/database";

interface StatsDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon: string;
  completedStaff: User[];
  pendingStaff: User[];
  totalActiveStaff: number;
}

export default function StatsDetailModal({ isOpen, onClose, title, icon, completedStaff, pendingStaff, totalActiveStaff }: StatsDetailModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center">
            <span className="text-2xl mr-3">{icon}</span>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {/* Summary */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">進捗状況</div>
            <div className="text-lg font-semibold text-gray-900">
              {completedStaff.length} / {totalActiveStaff}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${totalActiveStaff > 0 ? (completedStaff.length / totalActiveStaff) * 100 : 0}%` }}
              ></div>
            </div>
          </div>

          {/* Completed Staff */}
          {completedStaff.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-green-800 mb-2 flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                完了済み ({completedStaff.length}人)
              </h4>
              <div className="space-y-2">
                {completedStaff.map((staff) => (
                  <div key={staff.id} className="flex items-center p-2 bg-green-50 rounded-md">
                    <div className="w-8 h-8 bg-green-200 rounded-full flex items-center justify-center mr-3">
                      <span className="text-xs font-medium text-green-800">{staff.name.charAt(0)}</span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{staff.name}</div>
                      <div className="text-xs text-gray-500">{staff.email}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending Staff */}
          {pendingStaff.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-800 mb-2 flex items-center">
                <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
                未完了 ({pendingStaff.length}人)
              </h4>
              <div className="space-y-2">
                {pendingStaff.map((staff) => (
                  <div key={staff.id} className="flex items-center p-2 bg-gray-50 rounded-md">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                      <span className="text-xs font-medium text-gray-600">{staff.name.charAt(0)}</span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{staff.name}</div>
                      <div className="text-xs text-gray-500">{staff.email}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {completedStaff.length === 0 && pendingStaff.length === 0 && (
            <div className="text-center py-8">
              <div className="text-gray-400 text-4xl mb-2">👤</div>
              <p className="text-gray-600">活動予定のスタッフがいません</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <button onClick={onClose} className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors">
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
