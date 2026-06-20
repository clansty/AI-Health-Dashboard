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
  type: string;
  status: string;
  error_message: string;
  schedulable: boolean;
  rate_limited_at: string | null;
  rate_limit_reset_at: string | null;
  overload_until: string | null;
  temp_unschedulable_until: string | null;
  temp_unschedulable_reason: string;
  // 容量
  concurrency: number;
  current_concurrency: number;
  window_cost_limit: number | null;
  current_window_cost: number | null;
  window_cost_sticky_reserve: number | null;
  max_sessions: number | null;
  active_sessions: number | null;
  session_idle_timeout_minutes: number | null;
  base_rpm: number | null;
  current_rpm: number | null;
  rpm_strategy: string | null;
  rpm_sticky_buffer: number | null;
  quota_daily_limit: number | null;
  quota_daily_used: number | null;
  quota_weekly_limit: number | null;
  quota_weekly_used: number | null;
  quota_limit: number | null;
  quota_used: number | null;
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
    user_cost: number | null;
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
  forbidden_type: string;
  needs_reauth: boolean;
  needs_verify: boolean;
  error: string;
  error_code: string;
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
