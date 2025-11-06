import { supabase } from "./supabase";

export interface UploadResult {
  url: string;
  path: string;
}

export interface UploadError {
  message: string;
  code?: string;
}

/**
 * Compress image file before upload
 */
export function compressImage(file: File, maxWidth: number = 1920, quality: number = 0.8): Promise<File> {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            resolve(file); // Fallback to original file
          }
        },
        file.type,
        quality
      );
    };

    img.onerror = () => {
      resolve(file); // Fallback to original file
    };

    img.src = URL.createObjectURL(file);
  });
}

/**
 * Upload photo to Supabase Storage
 */
export async function uploadPhoto(file: File, bucket: string, path: string, compress: boolean = true): Promise<UploadResult> {
  try {
    // Validate file
    if (!file.type.startsWith("image/")) {
      throw new Error("画像ファイルのみアップロード可能です");
    }

    // Compress image if requested
    let fileToUpload = file;
    if (compress && file.size > 500 * 1024) {
      // Compress if larger than 500KB
      fileToUpload = await compressImage(file);
    }

    // Generate unique filename
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${path}/${fileName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage.from(bucket).upload(filePath, fileToUpload, {
      cacheControl: "3600",
      upsert: false,
    });

    if (error) {
      throw new Error(`アップロードに失敗しました: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);

    return {
      url: urlData.publicUrl,
      path: data.path,
    };
  } catch (error) {
    throw error instanceof Error ? error : new Error("アップロードに失敗しました");
  }
}

/**
 * Delete photo from Supabase Storage
 */
export async function deletePhoto(bucket: string, path: string): Promise<void> {
  try {
    const { error } = await supabase.storage.from(bucket).remove([path]);

    if (error) {
      throw new Error(`削除に失敗しました: ${error.message}`);
    }
  } catch (error) {
    throw error instanceof Error ? error : new Error("削除に失敗しました");
  }
}

/**
 * Upload route screenshot
 */
export async function uploadRoutePhoto(file: File, staffId: string, date: string): Promise<UploadResult> {
  const path = `route/${staffId}/${date}`;
  return uploadPhoto(file, "photos", path, true);
}

/**
 * Upload appearance photo
 */
export async function uploadAppearancePhoto(file: File, staffId: string, date: string): Promise<UploadResult> {
  const path = `appearance/${staffId}/${date}`;
  return uploadPhoto(file, "photos", path, true);
}

/**
 * Get today's date string in YYYY-MM-DD format (JST)
 */
export function getTodayDateString(): string {
  const jstDate = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
  return jstDate.toISOString().split("T")[0];
}

/**
 * Validate image file
 */
export function validateImageFile(file: File, maxSizeMB: number = 5): string | null {
  // Check file type
  if (!file.type.startsWith("image/")) {
    return "画像ファイルを選択してください";
  }

  // Check file size
  if (file.size > maxSizeMB * 1024 * 1024) {
    return `ファイルサイズは${maxSizeMB}MB以下にしてください`;
  }

  // Check if file is corrupted (basic check)
  if (file.size === 0) {
    return "ファイルが破損している可能性があります";
  }

  return null; // No errors
}
