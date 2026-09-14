/**
 * AgriSmart AI — Farmer Authentication & Farm Personalization Client
 * Manages local session tokens, user profile state, and API communication
 * for My Farm and Scan History.
 */

import { useState, useEffect } from "react";
import { resilientFetch } from "./api";

export interface User {
  id: number;
  name: string;
  email: string;
  location?: string;
  farm_size?: string;
  primary_crops?: string[];
  created_at?: string;
}

export interface ScanHistoryItem {
  id: number;
  user_id: number;
  scanned_at: string;
  crop_family: string;
  diagnostic_class: string;
  disease_name: string;
  confidence: number;
  severity: string;
  is_supported_crop: boolean;
  ood_status: string;
  image_path?: string;
  guidance: string[];
}

export interface RecentCropHealth {
  crop: string;
  status: "Healthy" | "Attention";
  condition: string;
  severity: string;
  latest_scan_date: string;
  badge_color: string;
  description: string;
}

export interface FarmOverview {
  success: boolean;
  farmer: User;
  total_scans: number;
  recent_crop_health: RecentCropHealth[];
  recent_scans: Array<{
    id: number;
    scanned_at: string;
    crop_family: string;
    disease_name: string;
    confidence: number;
    severity: string;
    image_path?: string;
  }>;
  health_note: string;
}

const TOKEN_KEY = "agrismart_farmer_token";
const USER_KEY = "agrismart_farmer_user";
const AUTH_CHANGE_EVENT = "agrismart_auth_change";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredAuth(token: string, user: User): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  } catch (e) {
    console.error("Failed to persist auth state:", e);
  }
}

export function clearStoredAuth(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  } catch (e) {
    console.error("Failed to clear auth state:", e);
  }
}

function getAuthHeaders(): Record<string, string> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Sign up a new farmer account
 */
export async function signup(payload: {
  name: string;
  email: string;
  password: string;
  location?: string;
  farm_size?: string;
  primary_crops?: string[];
}): Promise<{ success: boolean; token: string; user: User }> {
  const res = await resilientFetch("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.detail || data.message || "Failed to create farmer account");
  }

  setStoredAuth(data.token, data.user);
  return data;
}

/**
 * Log in an existing farmer
 */
export async function login(payload: {
  email: string;
  password: string;
}): Promise<{ success: boolean; token: string; user: User }> {
  const res = await resilientFetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.detail || data.message || "Invalid email or password");
  }

  setStoredAuth(data.token, data.user);
  return data;
}

/**
 * Log out and clear session
 */
export async function logout(): Promise<void> {
  try {
    await resilientFetch("/api/auth/logout", {
      method: "POST",
      headers: getAuthHeaders(),
    });
  } catch {
    // Ignore network errors on logout
  } finally {
    clearStoredAuth();
  }
}

/**
 * Get profile of current logged-in farmer
 */
export async function getProfile(): Promise<User> {
  const res = await resilientFetch("/api/auth/me", {
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    clearStoredAuth();
    throw new Error(data.detail || "Failed to fetch profile");
  }
  if (data.user) {
    setStoredAuth(getStoredToken() || "", data.user);
  }
  return data.user;
}

/**
 * Update farmer profile details
 */
export async function updateProfile(payload: {
  name?: string;
  location?: string;
  farm_size?: string;
  primary_crops?: string[];
}): Promise<User> {
  const res = await resilientFetch("/api/auth/profile", {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.detail || "Failed to update profile");
  }
  setStoredAuth(getStoredToken() || "", data.user);
  return data.user;
}

/**
 * Save a supported diagnosis to My Farm
 */
export async function saveDiagnosisToFarm(scanData: {
  crop_family: string;
  diagnostic_class: string;
  disease_name: string;
  confidence: number;
  severity?: string;
  is_supported_crop?: boolean;
  ood_status?: string;
  guidance?: string[];
  image_path?: string;
}): Promise<{ success: boolean; scan_id: number; message: string }> {
  const res = await resilientFetch("/api/scans/save", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(scanData),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.detail || data.message || "Failed to save diagnosis");
  }
  return data;
}

/**
 * Fetch chronological scan history
 */
export async function fetchScanHistory(cropFilter?: string): Promise<{
  total: number;
  scans: ScanHistoryItem[];
  crop_summary: Record<string, number>;
}> {
  const endpoint = cropFilter
    ? `/api/scans/history?crop=${encodeURIComponent(cropFilter)}`
    : "/api/scans/history";
  const res = await resilientFetch(endpoint, {
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.detail || "Failed to fetch scan history");
  }
  return data;
}

/**
 * Fetch a single scan detail
 */
export async function fetchScanDetail(scanId: number): Promise<ScanHistoryItem> {
  const res = await resilientFetch(`/api/scans/${scanId}`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.detail || "Failed to fetch scan detail");
  }
  return data.scan;
}

/**
 * Delete a saved scan
 */
export async function deleteScanRecord(scanId: number): Promise<void> {
  const res = await resilientFetch(`/api/scans/${scanId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.detail || "Failed to delete scan");
  }
}

export const deleteScan = deleteScanRecord;

/**
 * Fetch My Farm overview
 */
export async function fetchFarmOverview(): Promise<FarmOverview> {
  const res = await resilientFetch("/api/farmer/overview", {
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.detail || "Failed to fetch farm overview");
  }
  return data;
}

/**
 * React Hook for seamless authentication state tracking in components
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const syncState = () => {
      const storedToken = getStoredToken();
      const storedUser = getStoredUser();
      setToken(storedToken);
      setUser(storedUser);
      setLoading(false);
    };

    syncState();
    window.addEventListener(AUTH_CHANGE_EVENT, syncState);
    return () => window.removeEventListener(AUTH_CHANGE_EVENT, syncState);
  }, []);

  const refreshUser = async () => {
    try {
      const refreshed = await getProfile();
      setUser(refreshed);
    } catch {
      // Ignore if offline
    }
  };

  return {
    user,
    token,
    isLoggedIn: !!token && !!user,
    loading,
    logout,
    refreshUser,
  };
}
