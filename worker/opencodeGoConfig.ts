export const OPENCODE_GO_WINDOW_ORDER = ['rolling', 'weekly', 'monthly'] as const;

export type OpenCodeGoWindowKey = typeof OPENCODE_GO_WINDOW_ORDER[number];

export interface OpenCodeGoWorkspaceConfig {
  readonly id: string;
  readonly label: string;
  readonly cookieHeader: string | null;
  readonly windows: readonly OpenCodeGoWindowKey[] | null;
}

export interface OpenCodeGoRuntimeConfig {
  readonly workspaces: readonly OpenCodeGoWorkspaceConfig[];
  readonly defaultCookieHeader: string;
  readonly defaultWindows: readonly OpenCodeGoWindowKey[];
}

export interface OpenCodeGoConfigEnv {
  readonly OPENCODE_GO_WORKSPACE_ID?: string;
  readonly OPENCODE_GO_WORKSPACE_IDS?: string;
  readonly OPENCODE_GO_WORKSPACES_JSON?: string;
  readonly OPENCODE_GO_AUTH_COOKIE?: string;
  readonly OPENCODE_GO_WINDOWS?: string;
}

type OpenCodeGoConfigResult =
  | { readonly kind: 'ok'; readonly config: OpenCodeGoRuntimeConfig }
  | { readonly kind: 'error'; readonly message: string };

type WorkspaceParseResult =
  | { readonly kind: 'ok'; readonly workspace: OpenCodeGoWorkspaceConfig }
  | { readonly kind: 'error'; readonly message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isReadonlyArray(value: unknown): value is readonly unknown[] {
  return Array.isArray(value);
}

function isConfigResult(value: OpenCodeGoConfigResult | readonly OpenCodeGoWorkspaceConfig[]): value is OpenCodeGoConfigResult {
  return !Array.isArray(value);
}

function readText(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  if (typeof value !== 'string') return undefined;
  const clean = value.trim();
  return clean.length > 0 ? clean : undefined;
}

function splitCsv(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function cookieHeaderFrom(value: string | undefined): string {
  const cookie = value?.trim() ?? '';
  if (!cookie) return '';
  if (cookie.startsWith('auth=') || cookie.includes(';')) return cookie;
  return `auth=${cookie}`;
}

function parseWindowSelection(values: readonly string[]): OpenCodeGoWindowKey[] | null {
  const selected = new Set(values.map((value) => value.trim()).filter((value) => value.length > 0));
  const windows = OPENCODE_GO_WINDOW_ORDER.filter((window) => selected.has(window));
  return windows.length > 0 ? windows : null;
}

function parseGlobalWindows(value: string | undefined): OpenCodeGoWindowKey[] {
  return parseWindowSelection(splitCsv(value)) ?? [...OPENCODE_GO_WINDOW_ORDER];
}

function parseWindowsValue(value: unknown): OpenCodeGoWindowKey[] | null {
  if (typeof value === 'string') return parseWindowSelection(splitCsv(value));
  if (!isReadonlyArray(value)) return null;
  const values = value.filter((item): item is string => typeof item === 'string');
  return parseWindowSelection(values);
}

function parseLegacyWorkspace(value: string, index: number): OpenCodeGoWorkspaceConfig | null {
  const [idRaw, labelRaw] = value.split(':', 2);
  const id = (idRaw ?? '').trim();
  if (!id) return null;
  const label = (labelRaw ?? '').trim() || `Workspace ${index + 1}`;
  return { id, label, cookieHeader: null, windows: null };
}

function parseLegacyWorkspaces(value: string | undefined): OpenCodeGoWorkspaceConfig[] {
  const workspaces: OpenCodeGoWorkspaceConfig[] = [];
  const items = splitCsv(value);
  for (let index = 0; index < items.length; index++) {
    const workspace = parseLegacyWorkspace(items[index] ?? '', index);
    if (workspace) workspaces.push(workspace);
  }
  return workspaces;
}

function parseJsonWorkspace(value: unknown, index: number): WorkspaceParseResult {
  if (!isRecord(value)) {
    return { kind: 'error', message: `OPENCODE_GO_WORKSPACES_JSON 第 ${index + 1} 项必须是对象` };
  }

  const id = readText(value, 'id') ?? readText(value, 'workspaceId');
  if (!id) {
    return { kind: 'error', message: `OPENCODE_GO_WORKSPACES_JSON 第 ${index + 1} 项缺少 id` };
  }

  const label = readText(value, 'label') ?? readText(value, 'name') ?? `Workspace ${index + 1}`;
  const cookie = readText(value, 'cookie') ?? readText(value, 'authCookie') ?? readText(value, 'auth');
  return {
    kind: 'ok',
    workspace: {
      id,
      label,
      cookieHeader: cookieHeaderFrom(cookie) || null,
      windows: parseWindowsValue(value.windows),
    },
  };
}

function parseJsonWorkspaces(items: readonly unknown[]): OpenCodeGoConfigResult | readonly OpenCodeGoWorkspaceConfig[] {
  const workspaces: OpenCodeGoWorkspaceConfig[] = [];
  for (let index = 0; index < items.length; index++) {
    const result = parseJsonWorkspace(items[index], index);
    if (result.kind === 'error') return result;
    workspaces.push(result.workspace);
  }
  return workspaces;
}

interface JsonFallbacks {
  readonly defaultCookieHeader: string;
  readonly defaultWindows: readonly OpenCodeGoWindowKey[];
}

function parseJsonConfig(raw: string, fallback: JsonFallbacks): OpenCodeGoConfigResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return { kind: 'error', message: 'OPENCODE_GO_WORKSPACES_JSON 不是有效 JSON' };
    }
    throw error;
  }

  if (isReadonlyArray(parsed)) {
    return finishConfig(parseJsonWorkspaces(parsed), fallback.defaultCookieHeader, fallback.defaultWindows);
  }

  if (!isRecord(parsed)) {
    return { kind: 'error', message: 'OPENCODE_GO_WORKSPACES_JSON 必须是数组，或包含 workspaces 数组的对象' };
  }

  const items = parsed.workspaces;
  if (!isReadonlyArray(items)) {
    return { kind: 'error', message: 'OPENCODE_GO_WORKSPACES_JSON.workspaces 必须是数组' };
  }

  const defaultCookieHeader = cookieHeaderFrom(readText(parsed, 'cookie') ?? readText(parsed, 'authCookie')) || fallback.defaultCookieHeader;
  const defaultWindows = parseWindowsValue(parsed.windows) ?? fallback.defaultWindows;
  return finishConfig(parseJsonWorkspaces(items), defaultCookieHeader, defaultWindows);
}

function finishConfig(
  workspaceResult: OpenCodeGoConfigResult | readonly OpenCodeGoWorkspaceConfig[],
  defaultCookieHeader: string,
  defaultWindows: readonly OpenCodeGoWindowKey[],
): OpenCodeGoConfigResult {
  if (isConfigResult(workspaceResult)) return workspaceResult;
  if (workspaceResult.length === 0) {
    return { kind: 'error', message: '未配置 OPENCODE_GO_WORKSPACES_JSON.workspaces' };
  }
  if (!defaultCookieHeader && workspaceResult.some((workspace) => !workspace.cookieHeader)) {
    return { kind: 'error', message: '未配置 OPENCODE_GO_AUTH_COOKIE，且部分 workspace 缺少 cookie' };
  }
  return { kind: 'ok', config: { workspaces: workspaceResult, defaultCookieHeader, defaultWindows } };
}

export function parseOpenCodeGoConfig(env: OpenCodeGoConfigEnv): OpenCodeGoConfigResult {
  const defaultCookieHeader = cookieHeaderFrom(env.OPENCODE_GO_AUTH_COOKIE);
  const defaultWindows = parseGlobalWindows(env.OPENCODE_GO_WINDOWS);
  const jsonConfig = env.OPENCODE_GO_WORKSPACES_JSON?.trim();
  if (jsonConfig) return parseJsonConfig(jsonConfig, { defaultCookieHeader, defaultWindows });

  const workspaceIds = env.OPENCODE_GO_WORKSPACE_IDS?.trim() ? env.OPENCODE_GO_WORKSPACE_IDS : env.OPENCODE_GO_WORKSPACE_ID;
  return finishConfig(parseLegacyWorkspaces(workspaceIds), defaultCookieHeader, defaultWindows);
}
