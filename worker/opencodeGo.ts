import { parseOpenCodeGoConfig, type OpenCodeGoConfigEnv, type OpenCodeGoWindowKey, type OpenCodeGoWorkspaceConfig } from './opencodeGoConfig';
import { parseDashboardHtml, type ScrapedWindowUsage } from './opencodeGoParser';

interface OpenCodeGoWindowUsage {
  readonly usagePercent: number;
  readonly resetInSec: number;
  readonly percentRemaining: number;
  readonly resetTimeIso: string;
}

interface OpenCodeGoWorkspaceQuota {
  readonly label: string;
  readonly ok: boolean;
  readonly error: string | null;
  readonly rolling: OpenCodeGoWindowUsage | null;
  readonly weekly: OpenCodeGoWindowUsage | null;
  readonly monthly: OpenCodeGoWindowUsage | null;
}

const DASHBOARD_URL_PREFIX = 'https://opencode.ai/workspace/';
const DASHBOARD_URL_SUFFIX = '/go';
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Gecko/20100101 Firefox/148.0';
const SCRAPE_TIMEOUT_MS = 10_000;

function normalizeWindowUsage(window: ScrapedWindowUsage, now: number): OpenCodeGoWindowUsage {
  const usagePercent = Math.max(0, window.usagePercent);
  const resetInSec = Math.max(0, window.resetInSec);
  return {
    usagePercent,
    resetInSec,
    percentRemaining: Math.max(0, 100 - usagePercent),
    resetTimeIso: new Date(now + resetInSec * 1000).toISOString(),
  };
}

function sanitizeMessage(text: string, maxLength = 120): string {
  const clean = text
    .replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return (clean || 'unknown').slice(0, maxLength);
}

function hideWorkspaceId(workspaceId: string, message: string): string {
  return message
    .split(workspaceId).join('[workspace]')
    .split(encodeURIComponent(workspaceId)).join('[workspace]');
}

function isWorkspaceWindowSelected(selectedWindows: readonly OpenCodeGoWindowKey[], window: OpenCodeGoWindowKey): boolean {
  return selectedWindows.includes(window);
}

interface WindowSelectionContext {
  readonly selectedWindows: readonly OpenCodeGoWindowKey[];
  readonly now: number;
}

function selectedOrNull(parsed: ScrapedWindowUsage | null | undefined, window: OpenCodeGoWindowKey, ctx: WindowSelectionContext): OpenCodeGoWindowUsage | null {
  if (!isWorkspaceWindowSelected(ctx.selectedWindows, window) || !parsed) {
    return null;
  }
  return normalizeWindowUsage(parsed, ctx.now);
}

async function fetchDashboard(workspaceId: string, cookieHeader: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SCRAPE_TIMEOUT_MS);
  try {
    return await fetch(`${DASHBOARD_URL_PREFIX}${encodeURIComponent(workspaceId)}${DASHBOARD_URL_SUFFIX}`, {
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html',
        Cookie: cookieHeader,
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function queryWorkspaceQuota(
  workspace: OpenCodeGoWorkspaceConfig,
  defaultCookieHeader: string,
  selectedWindows: readonly OpenCodeGoWindowKey[],
): Promise<OpenCodeGoWorkspaceQuota> {
  try {
    const cookieHeader = workspace.cookieHeader ?? defaultCookieHeader;
    const response = await fetchDashboard(workspace.id, cookieHeader);
    if (!response.ok) {
      const text = await response.text();
      return {
        label: workspace.label,
        ok: false,
        error: hideWorkspaceId(workspace.id, `OpenCode Go dashboard error ${response.status}: ${sanitizeMessage(text)}`),
        rolling: null,
        weekly: null,
        monthly: null,
      };
    }

    const parsed = parseDashboardHtml(await response.text());
    if (!parsed.rolling && !parsed.weekly && !parsed.monthly) {
      return {
        label: workspace.label,
        ok: false,
        error: 'Could not parse any known OpenCode Go dashboard usage windows',
        rolling: null,
        weekly: null,
        monthly: null,
      };
    }

    const selection = { selectedWindows, now: Date.now() };
    return {
      label: workspace.label,
      ok: true,
      error: null,
      rolling: selectedOrNull(parsed.rolling, 'rolling', selection),
      weekly: selectedOrNull(parsed.weekly, 'weekly', selection),
      monthly: selectedOrNull(parsed.monthly, 'monthly', selection),
    };
  } catch (error) {
    return {
      label: workspace.label,
      ok: false,
      error: hideWorkspaceId(workspace.id, sanitizeMessage(error instanceof Error ? error.message : String(error))),
      rolling: null,
      weekly: null,
      monthly: null,
    };
  }
}

export async function handleOpenCodeGoQuota(env: OpenCodeGoConfigEnv): Promise<Response> {
  const config = parseOpenCodeGoConfig(env);
  if (config.kind === 'error') {
    return Response.json({ items: [], error: config.message }, { status: 200 });
  }

  const items = await Promise.all(
    config.config.workspaces.map((workspace) => (
      queryWorkspaceQuota(workspace, config.config.defaultCookieHeader, workspace.windows ?? config.config.defaultWindows)
    )),
  );

  return Response.json({ items, error: null });
}
