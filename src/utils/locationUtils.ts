/**
 * IPアドレスから住所を取得するユーティリティ関数
 */

interface LocationData {
  ip: string;
  country: string;
  region: string;
  city: string;
  postal: string;
  latitude: number;
  longitude: number;
  timezone: string;
  org: string;
}

interface GeolocationData {
  latitude: number;
  longitude: number;
  address?: string;
}

/**
 * IPアドレスから位置情報を取得
 */
export async function getLocationFromIP(ip?: string): Promise<LocationData | null> {
  try {
    const url = ip ? `http://ipapi.co/${ip}/json/` : "http://ipapi.co/json/";
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.reason || "Location API error");
    }

    return data;
  } catch (error) {
    console.error("Error fetching location from IP:", error);
    return null;
  }
}

/**
 * 緯度経度から住所を取得（逆ジオコーディング）
 */
export async function getAddressFromCoordinates(lat: number, lng: number): Promise<string | null> {
  try {
    // OpenStreetMap Nominatim API を使用（無料）
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ja`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.display_name) {
      return data.display_name;
    }

    return null;
  } catch (error) {
    console.error("Error fetching address from coordinates:", error);
    return null;
  }
}

/**
 * GPS座標文字列をパース
 */
export function parseGPSLocation(gpsString: string): GeolocationData | null {
  try {
    const [latStr, lngStr] = gpsString.split(",").map((s) => s.trim());
    const latitude = parseFloat(latStr);
    const longitude = parseFloat(lngStr);

    if (isNaN(latitude) || isNaN(longitude)) {
      return null;
    }

    return { latitude, longitude };
  } catch (error) {
    console.error("Error parsing GPS location:", error);
    return null;
  }
}

/**
 * 住所を日本語形式でフォーマット
 */
export function formatJapaneseAddress(locationData: LocationData): string {
  const parts = [];

  if (locationData.country && locationData.country !== "Japan") {
    parts.push(locationData.country);
  }

  if (locationData.region) {
    parts.push(locationData.region);
  }

  if (locationData.city) {
    parts.push(locationData.city);
  }

  if (locationData.postal) {
    parts.push(`〒${locationData.postal}`);
  }

  return parts.join(" ");
}
