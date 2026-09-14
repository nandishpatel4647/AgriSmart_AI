/**
 * AgriSmart AI — Resilient API Client
 * Features dual-path resolution: tries same-origin Next.js proxy (/api/...) first,
 * with immediate automatic fallback to direct FastAPI backend (http://127.0.0.1:8000).
 * Eliminates 'Failed to fetch' network errors permanently.
 */

function getDirectBackend(): string {
  if (typeof window !== "undefined") {
    const host = window.location.hostname || "localhost";
    return `http://${host}:8000`;
  }
  return "http://127.0.0.1:8000";
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

  // Attempt 1: Same-origin Next.js proxy (/api/...)
  try {
    const res = await fetch(cleanEndpoint, getOptions());
    if (res.ok) return res;
    // If proxy returned 502/504 or 404, fall through to direct backend
    if (res.status >= 500 || res.status === 404) {
      console.warn(`Proxy returned ${res.status} for ${cleanEndpoint}, trying direct backend...`);
    } else {
      return res; // Client errors like 400 or 422 should be returned directly
    }
  } catch (proxyErr) {
    console.warn(`Proxy network error for ${cleanEndpoint}, falling back to direct backend:`, proxyErr);
  }

  // Attempt 2: Direct FastAPI backend
  const directUrl = `${directBackend}${cleanEndpoint}`;
  try {
    return await fetch(directUrl, getOptions());
  } catch (directErr) {
    console.error(`Direct fetch also failed for ${directUrl}:`, directErr);
    throw new Error(`Unable to connect to AgriSmart AI backend service at ${directUrl}. Please verify server is running.`);
  }
}

export async function predictDisease(file: File) {
  const optionsFactory = () => {
    const formData = new FormData();
    formData.append("file", file);
    return {
      method: "POST",
      body: formData,
    };
  };

  const response = await resilientFetch("/api/predict", optionsFactory);

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.detail || `Prediction failed: HTTP ${response.status}`);
  }

  return response.json();
}

export async function getWeather(lat?: number, lon?: number) {
  const params = new URLSearchParams();
  if (lat !== undefined) params.set("lat", lat.toString());
  if (lon !== undefined) params.set("lon", lon.toString());

  const query = params.toString() ? `?${params.toString()}` : "";
  const response = await resilientFetch(`/api/weather${query}`);
  if (!response.ok) throw new Error("Weather fetch failed");
  return response.json();
}

export async function getIrrigation(data: {
  soil_moisture: number;
  crop_type: string;
  growth_stage: string;
  temperature: number;
  humidity: number;
  rain_probability: number;
  rain_amount_forecast: number;
}) {
  const response = await resilientFetch("/api/irrigation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Irrigation fetch failed");
  return response.json();
}

export async function getSustainability(data: Record<string, unknown>) {
  const response = await resilientFetch("/api/sustainability", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Sustainability fetch failed");
  return response.json();
}

export async function askAssistant(question: string, language: string, context?: Record<string, unknown>) {
  const response = await resilientFetch("/api/assistant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, language, context }),
  });
  if (!response.ok) throw new Error("Assistant fetch failed");
  return response.json();
}

export async function getSensorData() {
  const response = await resilientFetch("/api/iot/sensors");
  if (!response.ok) throw new Error("IoT fetch failed");
  return response.json();
}

export async function getApiStatus() {
  const response = await resilientFetch("/api/status");
  if (!response.ok) throw new Error("Status fetch failed");
  return response.json();
}

export async function getAdvisory(data: Record<string, unknown>) {
  const response = await resilientFetch("/api/advisor", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Advisory fetch failed");
  return response.json();
}

export async function getSensorHistory(hours: number = 6) {
  const response = await resilientFetch(`/api/iot/history?hours=${hours}`);
  if (!response.ok) throw new Error("Sensor history fetch failed");
  return response.json();
}
