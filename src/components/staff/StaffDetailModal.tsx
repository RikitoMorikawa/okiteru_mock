"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { User, PreviousDayReport } from "@/types/database";
import { getAddressFromCoordinates, parseGPSLocation } from "@/utils/locationUtils";
import { getTodayJST } from "../../utils/dateUtils";

interface StaffDetailModalProps {
  staff: User;
  isOpen: boolean;
  onClose: () => void;
}

interface StorageImage {
  name: string;
  url: string;
  created_at: string;
}

interface LocationInfo {
  gpsLocation: string;
  address: string | null;
  arrivalTime: string;
  arrivalLocation: string | null;
}

export default function StaffDetailModal({ staff, isOpen, onClose }: StaffDetailModalProps) {
  const [groomingImages, setGroomingImages] = useState<StorageImage[]>([]);
  const [routeImages, setRouteImages] = useState<StorageImage[]>([]);
  const [locationInfo, setLocationInfo] = useState<LocationInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // モーダルが開かれた時に画像を取得
  useEffect(() => {
    if (isOpen && staff.id) {
      fetchImages();
    }
  }, [isOpen, staff.id]);

  const fetchImages = async () => {
    setLoading(true);
    try {
      const today = getTodayJST();

      console.log("Fetching images for staff:", staff.id, "date:", today);

      // 前日の前日報告から画像URLを取得
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayDateString = yesterday.toISOString().split("T")[0];

      const { data: previousDayReports, error: previousDayError } = await supabase
        .from("previous_day_reports")
        .select("appearance_photo_url, route_photo_url, created_at")
        .eq("user_id", staff.id)
        .eq("report_date", yesterdayDateString)
        .order("created_at", { ascending: false })
        .limit(1);

      if (previousDayError) {
        console.error("Error fetching previous day reports:", previousDayError);
      }

      console.log("Previous day reports found:", previousDayReports);

      // 最新の出発報告レコードから位置情報を取得
      const { data: attendanceRecords, error: attendanceError } = (await supabase
        .from("attendance_records")
        .select("departure_time, arrival_time, arrival_gps_location, arrival_location")
        .eq("staff_id", staff.id)
        .eq("date", today)
        .not("departure_time", "is", null)
        .order("departure_time", { ascending: false })
        .limit(1)) as {
        data: Array<{
          departure_time: string;
          arrival_time: string | null;
          arrival_gps_location: string | null;
          arrival_location: string | null;
        }> | null;
        error: any;
      };

      if (attendanceError) {
        console.error("Error fetching attendance records:", attendanceError);
        return;
      }

      console.log("Attendance records found:", attendanceRecords);

      const latestRecord = attendanceRecords?.[0] as
        | {
            departure_time: string;
            arrival_time: string | null;
            arrival_gps_location: string | null;
            arrival_location: string | null;
          }
        | undefined;

      const previousDayReport = previousDayReports?.[0] as Pick<PreviousDayReport, "appearance_photo_url" | "route_photo_url" | "created_at"> | undefined;

      // 前日報告から写真を取得
      if (previousDayReport) {
        // 経路写真
        if (previousDayReport.route_photo_url) {
          // URLが相対パスの場合は、Supabaseの公開URLに変換
          let routeUrl = previousDayReport.route_photo_url;
          if (!routeUrl.startsWith("http")) {
            const {
              data: { publicUrl },
            } = supabase.storage.from("photos").getPublicUrl(routeUrl);
            routeUrl = publicUrl;
          }

          setRouteImages([
            {
              name: "route_photo",
              url: routeUrl,
              created_at: previousDayReport.created_at,
            },
          ]);
          console.log("Route photo found from previous day report:", routeUrl);
        } else {
          setRouteImages([]);
          console.log("No route photo found in previous day report");
        }

        // 身だしなみ写真
        if (previousDayReport.appearance_photo_url) {
          // URLが相対パスの場合は、Supabaseの公開URLに変換
          let appearanceUrl = previousDayReport.appearance_photo_url;
          if (!appearanceUrl.startsWith("http")) {
            const {
              data: { publicUrl },
            } = supabase.storage.from("photos").getPublicUrl(appearanceUrl);
            appearanceUrl = publicUrl;
          }

          setGroomingImages([
            {
              name: "appearance_photo",
              url: appearanceUrl,
              created_at: previousDayReport.created_at,
            },
          ]);
          console.log("Appearance photo found from previous day report:", appearanceUrl);
        } else {
          setGroomingImages([]);
          console.log("No appearance photo found in previous day report");
        }
      } else {
        // 前日報告がない場合
        setRouteImages([]);
        setGroomingImages([]);
        console.log("No previous day report found");
      }

      // 位置情報の処理
      if (latestRecord) {
        if (latestRecord.arrival_time && latestRecord.arrival_gps_location) {
          const gpsData = parseGPSLocation(latestRecord.arrival_gps_location);
          if (gpsData) {
            try {
              const address = await getAddressFromCoordinates(gpsData.latitude, gpsData.longitude);
              setLocationInfo({
                gpsLocation: latestRecord.arrival_gps_location,
                address,
                arrivalTime: latestRecord.arrival_time,
                arrivalLocation: latestRecord.arrival_location,
              });
              console.log("Location info set:", { gpsLocation: latestRecord.arrival_gps_location, address });
            } catch (error) {
              console.error("Error getting address:", error);
              setLocationInfo({
                gpsLocation: latestRecord.arrival_gps_location,
                address: null,
                arrivalTime: latestRecord.arrival_time,
                arrivalLocation: latestRecord.arrival_location,
              });
            }
          }
        } else {
          setLocationInfo(null);
        }
      } else {
        // 出勤記録がない場合
        setLocationInfo(null);
        console.log("No attendance record found for today");
      }
    } catch (error) {
      console.error("Error fetching images:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mr-4">
              <span className="text-lg font-medium text-gray-600">{staff.name.charAt(0)}</span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{staff.name}</h2>
              <p className="text-sm text-gray-500">本日の詳細情報</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">画像を読み込み中...</span>
            </div>
          ) : (
            <div className="space-y-8">
              {/* 身だしなみ写真セクション */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  身だしなみ写真
                </h3>

                {groomingImages.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {groomingImages.map((image, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={image.url}
                          alt={`身だしなみ写真 ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setSelectedImage(image.url)}
                          onError={(e) => {
                            console.error("Failed to load grooming image:", image.url);
                            console.error("Error event:", e);
                          }}
                          onLoad={() => {
                            console.log("Successfully loaded grooming image:", image.url);
                          }}
                        />
                        <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">前日報告</div>
                        <div className="absolute top-2 right-2 bg-blue-600 bg-opacity-90 text-white text-xs px-2 py-1 rounded">
                          {formatTime(image.created_at)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <p className="text-gray-500">本日の身だしなみ写真はありません</p>
                  </div>
                )}
              </div>

              {/* 経路写真セクション */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  経路写真
                </h3>

                {routeImages.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {routeImages.map((image, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={image.url}
                          alt={`経路写真 ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setSelectedImage(image.url)}
                          onError={(e) => {
                            console.error("Failed to load route image:", image.url);
                            console.error("Error event:", e);
                          }}
                          onLoad={() => {
                            console.log("Successfully loaded route image:", image.url);
                          }}
                        />
                        <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">前日報告</div>
                        <div className="absolute top-2 right-2 bg-green-600 bg-opacity-90 text-white text-xs px-2 py-1 rounded">
                          {formatTime(image.created_at)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <p className="text-gray-500">本日の経路写真はありません</p>
                  </div>
                )}
              </div>

              {/* 位置情報セクション */}
              {locationInfo && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    到着位置情報
                  </h3>

                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-gray-400 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-gray-700">到着時刻</p>
                        <p className="text-sm text-gray-600">{formatTime(locationInfo.arrivalTime)}</p>
                      </div>
                    </div>

                    {locationInfo.arrivalLocation && (
                      <div className="flex items-start">
                        <svg className="w-5 h-5 text-gray-400 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                          />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-gray-700">報告場所</p>
                          <p className="text-sm text-gray-600">{locationInfo.arrivalLocation}</p>
                        </div>
                      </div>
                    )}

                    {locationInfo.address && (
                      <div className="flex items-start">
                        <svg className="w-5 h-5 text-gray-400 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                          />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-gray-700">推定住所</p>
                          <p className="text-sm text-gray-600">{locationInfo.address}</p>
                        </div>
                      </div>
                    )}

                    {/* Google Mapsリンク */}
                    <div className="pt-2 border-t border-gray-200">
                      <a
                        href={`https://www.google.com/maps?q=${locationInfo.gpsLocation}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                        Google Mapsで確認
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 画像拡大表示モーダル */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-60 p-4" onClick={() => setSelectedImage(null)}>
          <div className="relative max-w-4xl max-h-full">
            <img src={selectedImage} alt="拡大表示" className="max-w-full max-h-full object-contain rounded-lg" />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
