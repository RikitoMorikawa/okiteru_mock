"use client";

import { useState, useEffect } from "react";

interface ConnectionStatus {
  isOnline: boolean;
  lastSync: Date;
  syncStatus: "synced" | "syncing" | "error";
}

export default function StatusIndicator() {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isOnline: true,
    lastSync: new Date(),
    syncStatus: "synced",
  });
  const [showDetails, setShowDetails] = useState(false);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setConnectionStatus((prev) => ({
        ...prev,
        isOnline: true,
        syncStatus: "syncing",
      }));

      // Simulate sync completion
      setTimeout(() => {
        setConnectionStatus((prev) => ({
          ...prev,
          lastSync: new Date(),
          syncStatus: "synced",
        }));
      }, 1000);
    };

    const handleOffline = () => {
      setConnectionStatus((prev) => ({
        ...prev,
        isOnline: false,
        syncStatus: "error",
      }));
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial status check
    setConnectionStatus((prev) => ({
      ...prev,
      isOnline: navigator.onLine,
    }));

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Auto-sync simulation (in real app, this would be actual sync logic)
  useEffect(() => {
    if (!connectionStatus.isOnline) return;

    const syncInterval = setInterval(() => {
      setConnectionStatus((prev) => ({
        ...prev,
        lastSync: new Date(),
        syncStatus: "synced",
      }));
    }, 30000); // Sync every 30 seconds

    return () => clearInterval(syncInterval);
  }, [connectionStatus.isOnline]);

  const getStatusColor = () => {
    if (!connectionStatus.isOnline) return "bg-red-500";
    if (connectionStatus.syncStatus === "syncing") return "bg-yellow-500";
    if (connectionStatus.syncStatus === "error") return "bg-red-500";
    return "bg-green-500";
  };

  const getStatusText = () => {
    if (!connectionStatus.isOnline) return "オフライン";
    if (connectionStatus.syncStatus === "syncing") return "同期中";
    if (connectionStatus.syncStatus === "error") return "エラー";
    return "オンライン";
  };



  return (
    <div className="relative">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center space-x-2 px-3 py-1 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
      >
        <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}></div>
        <span className="text-sm font-medium text-gray-700">{getStatusText()}</span>
      </button>

      {showDetails && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">接続状態</span>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}></div>
                <span className="text-sm text-gray-600">{getStatusText()}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">最終同期</span>
              <span className="text-sm text-gray-600">
                {connectionStatus.lastSync.toLocaleTimeString("ja-JP", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>

            <div className="pt-2 border-t border-gray-200">
              <div className="text-xs text-gray-500">
                {connectionStatus.isOnline ? (
                  <div className="space-y-1">
                    <p>✅ サーバーに接続済み</p>
                    <p>✅ リアルタイム更新有効</p>
                    <p>✅ データ同期正常</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p>❌ サーバー接続なし</p>
                    <p>⏸️ リアルタイム更新停止</p>
                    <p>💾 ローカルに保存中</p>
                  </div>
                )}
              </div>
            </div>

            {!connectionStatus.isOnline && (
              <div className="pt-2 border-t border-gray-200">
                <p className="text-xs text-amber-600">オフライン中です。入力したデータはローカルに保存され、接続復旧時に自動同期されます。</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
