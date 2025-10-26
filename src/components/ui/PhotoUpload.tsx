"use client";

import { useState, useRef } from "react";
import Image from "next/image";

interface PhotoUploadProps {
  onPhotoSelect: (file: File) => void;
  onPhotoRemove: () => void;
  selectedPhoto: File | null;
  accept?: string;
  maxSize?: number; // in MB
  label: string;
  description?: string;
  required?: boolean;
  error?: string;
  preview?: boolean;
}

export default function PhotoUpload({
  onPhotoSelect,
  onPhotoRemove,
  selectedPhoto,
  accept = "image/*",
  maxSize = 5,
  label,
  description,
  required = false,
  error,
  preview = true,
}: PhotoUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return;
    }

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      return;
    }

    onPhotoSelect(file);

    // Create preview URL if preview is enabled
    if (preview) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  const handleRemove = () => {
    onPhotoRemove();
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const openFileDialog = () => {
    inputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs sm:text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {selectedPhoto && preview && previewUrl ? (
        // Preview Mode - Mobile Optimized
        <div className="relative">
          <div className="relative w-full max-w-xs sm:max-w-md mx-auto">
            <Image src={previewUrl} alt="Preview" width={300} height={120} className="w-full h-24 sm:h-32 object-cover rounded-lg border-2 border-gray-300" />
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
            >
              <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="mt-1 text-center">
            <p className="text-xs text-gray-600 font-medium truncate">{selectedPhoto.name}</p>
            <p className="text-xs text-gray-500">{(selectedPhoto.size / 1024 / 1024).toFixed(2)} MB</p>
            <button type="button" onClick={openFileDialog} className="mt-1 text-xs text-blue-600 hover:text-blue-500">
              別の写真を選択
            </button>
          </div>
        </div>
      ) : (
        // Upload Mode - Mobile Optimized
        <div
          className={`
            relative border-2 border-dashed rounded-lg p-3 sm:p-6 transition-colors cursor-pointer
            ${dragActive ? "border-blue-400 bg-blue-50" : error ? "border-red-300 bg-red-50" : "border-gray-300 hover:border-gray-400"}
          `}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={openFileDialog}
        >
          <div className="text-center">
            {selectedPhoto && !preview ? (
              // File selected but no preview - Mobile Optimized
              <div className="space-y-1 sm:space-y-2">
                <div className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-green-400">
                  <svg fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="text-xs text-gray-600">
                  <p className="font-medium truncate">{selectedPhoto.name}</p>
                  <p>{(selectedPhoto.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove();
                  }}
                  className="text-xs text-red-600 hover:text-red-500"
                >
                  削除
                </button>
              </div>
            ) : (
              // No file selected - Mobile Optimized
              <>
                <svg className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="mt-2 sm:mt-4">
                  <p className="text-xs text-gray-600">
                    <span className="font-medium text-blue-600 hover:text-blue-500">ファイルをアップロード</span>
                    <span className="hidden sm:inline"> またはドラッグ&ドロップ</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF 最大{maxSize}MB</p>
                </div>
              </>
            )}
          </div>

          <input ref={inputRef} type="file" className="sr-only" accept={accept} onChange={handleChange} required={required} />
        </div>
      )}

      {description && <p className="text-sm text-gray-500">{description}</p>}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
