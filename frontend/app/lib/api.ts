import type { AssistantResponse, DetectionResponse, InsightInput, InsightResponse, IoTReading, WeatherResponse } from "./types";

function getDirectBackend(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
  }
  if (typeof window !== "undefined") {
    const host = window.location.hostname || "localhost";
    if (host !== "localhost" && host !== "127.0.0.1") {
      return "https://outsourcing-implementation-randy-maple.trycloudflare.com";
    }
    return `http://${host}:8000`;
  }
  return "https://outsourcing-implementation-randy-maple.trycloudflare.com";
}

export class ApiError extends Error {
  constructor(public status: number, public body: any) {
    super(`API error: ${status}`);
    this.name = "ApiError";
  }
}

export async function resilientFetch(
  endpoint: string, 
  optionsInit?: RequestInit | (() => RequestInit)
): Promise<Response> {
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const directBackend = getDirectBackend();
  
  const getOptions = () => {
    if (typeof optionsInit === "function") {
      return optionsInit();
    }
    return optionsInit || {};
  };

  // On production cloud domains, call the direct high-performance backend first!
  const isCloud = typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1";
  
  if (isCloud) {
    const directUrl = `${directBackend}${cleanEndpoint}`;
    try {
      const res = await fetch(directUrl, getOptions());
      if (res.ok) return res;
      console.warn(`Direct backend returned ${res.status}, trying proxy fallback...`);
    } catch (directErr) {
      console.warn(`Direct fetch to ${directUrl} failed, trying proxy fallback:`, directErr);
    }
  }

  // Attempt local/same-origin proxy
  try {
    const res = await fetch(cleanEndpoint, getOptions());
    if (res.ok) return res;
    if (!isCloud) {
      // On localhost, try direct port 8000 fallback
      const directUrl = `${directBackend}${cleanEndpoint}`;
      return await fetch(directUrl, getOptions());
    }
    return res;
  } catch (proxyErr) {
    if (!isCloud) {
      const directUrl = `${directBackend}${cleanEndpoint}`;
      return await fetch(directUrl, getOptions());
    }
    throw proxyErr;
  }
}

async function request<T>(method: string, path: string, body?: any): Promise<T> {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const endpoint = cleanPath.startsWith("/api") ? cleanPath : `/api${cleanPath}`;
  
  const headers: HeadersInit = {
    "Accept": "application/json",
  };
  if (body) {
    headers["Content-Type"] = "application/json";
  }

  const res = await resilientFetch(endpoint, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    throw new ApiError(res.status, errBody);
  }
  return res.json();
}

export const apiGet = <T>(path: string) => request<T>("GET", path);
export const apiPost = <T>(path: string, body: any) => request<T>("POST", path, body);

export async function apiUpload<T>(path: string, file: File, field = "image"): Promise<T> {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const endpoint = cleanPath.startsWith("/api") ? cleanPath : `/api${cleanPath}`;

  const formData = new FormData();
  formData.append(field, file);
  // Also append 'file' for backend compatibility
  if (field !== "file") {
    formData.append("file", file);
  }

  const res = await resilientFetch(endpoint, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    throw new ApiError(res.status, errBody);
  }
  return res.json();
}

// Backward compatibility exports for secondary pages
export async function predictDisease(file: File) {
  return apiUpload("/predict", file, "file");
}

export async function getWeather(lat?: number, lon?: number) {
  const params = new URLSearchParams();
  if (lat !== undefined) params.set("lat", lat.toString());
  if (lon !== undefined) params.set("lon", lon.toString());
  const query = params.toString() ? `?${params.toString()}` : "";
  return apiGet(`/weather${query}`);
}

export async function getIrrigation(data: any) {
  return apiPost("/irrigation", data);
}

export async function getSustainability(data: any) {
  return apiPost("/sustainability", data);
}

export async function askAssistant(question: string, language: string, context?: any) {
  return apiPost("/assistant", { question, language, context });
}

export async function getApiStatus() {
  return apiGet("/status");
}

export async function getAdvisory(data: any) {
  return apiPost("/advisor", data);
}
