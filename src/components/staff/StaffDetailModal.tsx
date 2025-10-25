"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "@/types/database";

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

export default function StaffDetailModal({ staff, isOpen, onClose }: StaffDetailModalProps) {
  const [groomingImages, setGroomingImages] = useState<StorageImage[]>([]);
  const [routeImages, setRouteImages] = useState<StorageImage[]>([]);
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
      const today = new Date().toISOString().split("T")[0];

      console.log("Fetching images for staff:", staff.id, "date:", today);

      // 最新の出発報告レコードから画像URLを取得
      const { data: attendanceRecords, error: attendanceError } = (await supabase
        .from("attendance_records")
        .select("route_photo_url, appearance_photo_url, departure_time")
        .eq("staff_id", staff.id)
        .eq("date", today)
        .not("departure_time", "is", null)
        .order("departure_time", { ascending: false })
        .limit(1)) as {
        data: Array<{
          route_photo_url: string | null;
          appearance_photo_url: string | null;
          departure_time: string;
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
            route_photo_url: string | null;
            appearance_photo_url: string | null;
            departure_time: string;
          }
        | undefined;

      if (latestRecord) {
        // 経路写真
        if (latestRecord.route_photo_url) {
          // URLが相対パスの場合は、Supabaseの公開URLに変換
          let routeUrl = latestRecord.route_photo_url;
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
              created_at: latestRecord.departure_time,
            },
          ]);
          console.log("Route photo found:", routeUrl);
        } else {
          setRouteImages([]);
          console.log("No route photo found");
        }

        // 身だしなみ写真
        if (latestRecord.appearance_photo_url) {
          // URLが相対パスの場合は、Supabaseの公開URLに変換
          let appearanceUrl = latestRecord.appearance_photo_url;
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
              created_at: latestRecord.departure_time,
            },
          ]);
          console.log("Appearance photo found:", appearanceUrl);
        } else {
          setGroomingImages([]);
          console.log("No appearance photo found");
        }
      } else {
        // 出発報告がない場合
        setRouteImages([]);
        setGroomingImages([]);
        console.log("No departure record found for today");
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
                        <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
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
                        <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
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
