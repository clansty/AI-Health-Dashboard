// ===== newapi-health API =====

export interface HistoryPoint {
  timestamp: number;
  channel_count: number;
  available: boolean;
}

export interface ModelInfo {
  current_channel_count: number;
  available: boolean;
  history: HistoryPoint[];
}

export interface ModelStatusResponse {
  timestamp: number;
  models: Record<string, ModelInfo>;
}

// ===== sub2api API =====

export interface Sub2ApiAccount {
  id: number;
  platform: string;
  status: string;
  error_message: string;
}

export interface UsageWindow {
  utilization: number;
  resets_at: string;
  remaining_seconds: number;
  window_stats?: {
    requests: number;
    tokens: number;
    cost: number;
    standard_cost: number;
    user_cost: number;
  };
  used_requests?: number;
  limit_requests?: number;
}

export interface AntigravityQuotaEntry {
  utilization: number;
  reset_time: string;
}

export interface Sub2ApiUsage {
  source: string;
  updated_at: string;
  five_hour: UsageWindow | null;
  seven_day: UsageWindow | null;
  seven_day_sonnet: UsageWindow | null;
  gemini_shared_daily: UsageWindow | null;
  gemini_pro_daily: UsageWindow | null;
  gemini_flash_daily: UsageWindow | null;
  antigravity_quota: Record<string, AntigravityQuotaEntry> | null;
  subscription_tier: string;
  is_forbidden: boolean;
  forbidden_reason: string;
  needs_reauth: boolean;
  error: string;
}

// ===== UI 层用的聚合类型 =====

export interface AggregatedBar {
  available: boolean;
  timestampStart: number;
  timestampEnd: number;
}

export interface ModelEntry {
  name: string;
  channelCount: number;
  available: boolean;
  bars: AggregatedBar[];
  icon?: string;
}

export interface AccountWithUsage {
  account: Sub2ApiAccount;
  usage: Sub2ApiUsage | null;
  loading: boolean;
  error: string | null;
}
