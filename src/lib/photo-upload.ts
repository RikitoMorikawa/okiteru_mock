import { supabase } from "./supabase";

export interface PhotoUploadResult {
  url: string;
  path: string;
}

/**
 * 写真をSupabaseストレージにアップロードする
 */
export async function uploadPhoto(file: File, userId: string, type: "route" | "appearance", date?: string): Promise<PhotoUploadResult> {
  try {
    // ファイル名を生成（ユーザーID/日付/タイプ_タイムスタンプ.拡張子）
    const timestamp = new Date().getTime();
    const fileExt = file.name.split(".").pop();
    const fileName = `${userId}/${date}/${type}_${timestamp}.${fileExt}`;

    // ファイルをアップロード
    const { data, error } = await supabase.storage.from("photos").upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
    });

    if (error) {
      console.error("Photo upload error:", error);
      throw new Error(`写真のアップロードに失敗しました: ${error.message}`);
    }

    // 公開URLを取得
    const {
      data: { publicUrl },
    } = supabase.storage.from("photos").getPublicUrl(fileName);

    return {
      url: publicUrl,
      path: fileName,
    };
  } catch (error) {
    console.error("Photo upload error:", error);
    throw error;
  }
}

/**
 * 写真を削除する
 */
export async function deletePhoto(path: string): Promise<void> {
  try {
    const { error } = await supabase.storage.from("photos").remove([path]);

    if (error) {
      console.error("Photo delete error:", error);
      throw new Error(`写真の削除に失敗しました: ${error.message}`);
    }
  } catch (error) {
    console.error("Photo delete error:", error);
    throw error;
  }
}

/**
 * ファイルサイズとタイプを検証する
 */
export function validatePhotoFile(file: File): { isValid: boolean; error?: string } {
  // ファイルサイズチェック（5MB以下）
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: "ファイルサイズは5MB以下にしてください",
    };
  }

  // ファイルタイプチェック
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: "JPEG、PNG、WebP形式の画像ファイルのみアップロード可能です",
    };
  }

  return { isValid: true };
}
