import type { AssistantResponse, DetectionResponse, InsightInput, InsightResponse, IoTReading, WeatherResponse } from "./types";

function getDirectBackend(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.trim().replace(/\/+$/, "");
  }
  if (typeof window !== "undefined") {
    const host = window.location.hostname || "localhost";
    if (host === "localhost" || host === "127.0.0.1") {
      return `http://${host}:8000`;
    }
    return "";
  }
  return "";
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

  // If directBackend is configured and non-empty, try direct call first
  if (directBackend) {
    const directUrl = `${directBackend}${cleanEndpoint}`;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const opts = getOptions();
      const res = await fetch(directUrl, { ...opts, signal: opts.signal || controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) return res;
    } catch (directErr) {
      console.warn(`Direct fetch to ${directUrl} failed, trying relative proxy:`, directErr);
    }
  }

  // Attempt local/same-origin proxy fetch
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  const opts = getOptions();
  try {
    const res = await fetch(cleanEndpoint, { ...opts, signal: opts.signal || controller.signal });
    clearTimeout(timeoutId);
    return res;
  } catch (proxyErr) {
    clearTimeout(timeoutId);
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

  const res = await resilientFetch(endpoint, () => ({
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  }));

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

  const getUploadOptions = () => {
    const formData = new FormData();
    formData.append(field, file);
    // Also append 'file' for backend compatibility
    if (field !== "file") {
      formData.append("file", file);
    }
    return {
      method: "POST",
      body: formData,
    };
  };

  const res = await resilientFetch(endpoint, getUploadOptions);

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

export async function getCropRecommendation(data: any) {
  return apiPost("/crop-recommendation", data);
}

export async function getApiStatus() {
  return apiGet("/status");
}

export async function getAdvisory(data: any) {
  return apiPost("/advisor", data);
}


