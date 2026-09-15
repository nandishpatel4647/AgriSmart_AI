export interface PhotoQuality {
  status: "pass" | "retake";
  sharpness_score: number;
  brightness_score: number;
  leaf_likelihood: "leaf_candidate" | "not_leaf_like" | "unknown";
  issues: string[];
  recommendation: string;
}

export interface DetectionResponse {
  id: string;
  status: "preview" | "ready";
  model_status: "weights_missing" | "runtime_missing" | "ready";
  filename: string;
  disease_label: string;
  confidence: number | null;
  crop: string;
  created_at: string;
  analysis_note: string;
  precautionary_guidance: string[];
  photo_quality?: PhotoQuality;
  // Grad-CAM and OOD metadata from real AgriSmart backend
  gradcam_url?: string | null;
  ood_status?: string | null;
  is_ood?: boolean;
  is_supported_crop?: boolean;
  out_of_distribution?: boolean;
  leaf_display_name?: string;
  treatment_plan?: {
    chemical_management?: string[];
    organic_management?: string[];
    preventive_measures?: string[];
  };
}

export interface WeatherDay {
  date: string;
  max_temperature: number | null;
  min_temperature: number | null;
  precipitation_mm: number | null;
  rain_probability: number | null;
  evapotranspiration_mm?: number | null;
}

export interface WeatherCurrent {
  temperature: number | null;
  humidity: number | null;
  precipitation: number | null;
  wind_speed: number | null;
  city_name?: string;
  condition?: string;
}

export interface WeatherResponse {
  source: string;
  source_url: string;
  fetched_at: string;
  latitude: number;
  longitude: number;
  current: WeatherCurrent;
  forecast: WeatherDay[];
}

export interface InsightInput {
  crop: string;
  growth_stage: string;
  soil_moisture: number;
  rain_probability: number;
  temperature?: number;
  disease_detected?: boolean;
  language?: Language;
}

export interface InsightResponse {
  irrigation_status: "adequate" | "water_soon" | "water_immediately";
  irrigation_title: string;
  irrigation_reason: string;
  sustainability_score: number;
  score_formula: string;
  suggestions: string[];
  activity_log: string[];
  plain_language_explanation?: string;
}

export interface AssistantResponse {
  mode?: "grounded_rules" | string;
  answer?: string;
  response?: string;
  voice_script?: string;
  actions?: string[];
  grounded_facts?: string[];
  success?: boolean;
}

export interface IoTReading {
  soil_moisture: number;
  temperature: number;
  humidity: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  timestamp: string;
}

export type Language = "en" | "hi" | "gu";
