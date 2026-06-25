type OpenCodeGoWindowKey = 'rolling' | 'weekly' | 'monthly';

export interface ScrapedWindowUsage {
  readonly usagePercent: number;
  readonly resetInSec: number;
}

const SCRAPED_NUMBER_PATTERN = String.raw`(-?\d+(?:\.\d+)?)`;
const WINDOW_PATTERNS: Record<OpenCodeGoWindowKey, readonly [RegExp, RegExp]> = {
  rolling: [
    new RegExp(String.raw`rollingUsage:\$R\[\d+\]=\{[^}]*usagePercent:${SCRAPED_NUMBER_PATTERN}[^}]*resetInSec:${SCRAPED_NUMBER_PATTERN}[^}]*\}`),
    new RegExp(String.raw`rollingUsage:\$R\[\d+\]=\{[^}]*resetInSec:${SCRAPED_NUMBER_PATTERN}[^}]*usagePercent:${SCRAPED_NUMBER_PATTERN}[^}]*\}`),
  ],
  weekly: [
    new RegExp(String.raw`weeklyUsage:\$R\[\d+\]=\{[^}]*usagePercent:${SCRAPED_NUMBER_PATTERN}[^}]*resetInSec:${SCRAPED_NUMBER_PATTERN}[^}]*\}`),
    new RegExp(String.raw`weeklyUsage:\$R\[\d+\]=\{[^}]*resetInSec:${SCRAPED_NUMBER_PATTERN}[^}]*usagePercent:${SCRAPED_NUMBER_PATTERN}[^}]*\}`),
  ],
  monthly: [
    new RegExp(String.raw`monthlyUsage:\$R\[\d+\]=\{[^}]*usagePercent:${SCRAPED_NUMBER_PATTERN}[^}]*resetInSec:${SCRAPED_NUMBER_PATTERN}[^}]*\}`),
    new RegExp(String.raw`monthlyUsage:\$R\[\d+\]=\{[^}]*resetInSec:${SCRAPED_NUMBER_PATTERN}[^}]*usagePercent:${SCRAPED_NUMBER_PATTERN}[^}]*\}`),
  ],
};

function parseWindowUsage(html: string, [rePctFirst, reResetFirst]: readonly [RegExp, RegExp]): ScrapedWindowUsage | null {
  const pctFirstMatch = rePctFirst.exec(html);
  if (pctFirstMatch) {
    const usagePercent = Number(pctFirstMatch[1]);
    const resetInSec = Number(pctFirstMatch[2]);
    if (Number.isFinite(usagePercent) && Number.isFinite(resetInSec)) {
      return { usagePercent, resetInSec };
    }
  }

  const resetFirstMatch = reResetFirst.exec(html);
  if (resetFirstMatch) {
    const resetInSec = Number(resetFirstMatch[1]);
    const usagePercent = Number(resetFirstMatch[2]);
    if (Number.isFinite(usagePercent) && Number.isFinite(resetInSec)) {
      return { usagePercent, resetInSec };
    }
  }

  return null;
}

function parseHumanReadableTime(timeStr: string): number | null {
  const normalized = timeStr.toLowerCase().trim().replace(/\s+/g, ' ');
  if (['reset-now', 'reset now', 'now', 'resets now'].includes(normalized)) {
    return 0;
  }

  const dayMatch = normalized.match(/(\d+(?:\.\d+)?)\s*days?/);
  const hourMatch = normalized.match(/(\d+(?:\.\d+)?)\s*hours?/);
  const minuteMatch = normalized.match(/(\d+(?:\.\d+)?)\s*minutes?/);
  const secondMatch = normalized.match(/(\d+(?:\.\d+)?)\s*seconds?/);
  if (!dayMatch && !hourMatch && !minuteMatch && !secondMatch) {
    return null;
  }

  return (dayMatch ? Number(dayMatch[1]) * 86400 : 0) +
    (hourMatch ? Number(hourMatch[1]) * 3600 : 0) +
    (minuteMatch ? Number(minuteMatch[1]) * 60 : 0) +
    (secondMatch ? Number(secondMatch[1]) : 0);
}

function parseDataSlotFormat(html: string): Partial<Record<OpenCodeGoWindowKey, ScrapedWindowUsage>> {
  const result: Partial<Record<OpenCodeGoWindowKey, ScrapedWindowUsage>> = {};
  const items = html.split(/data-slot="usage-item"/);

  for (let i = 1; i < items.length; i++) {
    const content = items[i] ?? '';
    const labelMatch = content.match(/data-slot="usage-label">([^<]+)</);
    const usageMatch = content.match(/data-slot="usage-value">[^0-9]*(\d+(?:\.\d+)?)/);
    const resetMatch = content.match(/data-slot="(reset-time|reset-now)">([\s\S]*?)<\/span>/);
    if (!labelMatch || !usageMatch || !resetMatch) {
      continue;
    }

    const usagePercent = Number(usageMatch[1]);
    const resetContent = resetMatch[2]
      .replace(/<!--\$-->/g, '')
      .replace(/<!--\/-->/g, '')
      .replace(/Resets?\s*in\s*/i, '')
      .trim();
    const resetInSec = resetMatch[1] === 'reset-now' ? 0 : parseHumanReadableTime(resetContent);
    if (!Number.isFinite(usagePercent) || resetInSec === null || !Number.isFinite(resetInSec)) {
      continue;
    }

    const label = labelMatch[1].trim().toLowerCase();
    if (label.includes('rolling')) result.rolling = { usagePercent, resetInSec };
    if (label.includes('weekly')) result.weekly = { usagePercent, resetInSec };
    if (label.includes('monthly')) result.monthly = { usagePercent, resetInSec };
  }

  return result;
}

export function parseDashboardHtml(html: string): Partial<Record<OpenCodeGoWindowKey, ScrapedWindowUsage>> {
  const parsed: Partial<Record<OpenCodeGoWindowKey, ScrapedWindowUsage>> = {
    rolling: parseWindowUsage(html, WINDOW_PATTERNS.rolling) ?? undefined,
    weekly: parseWindowUsage(html, WINDOW_PATTERNS.weekly) ?? undefined,
    monthly: parseWindowUsage(html, WINDOW_PATTERNS.monthly) ?? undefined,
  };

  if (parsed.rolling || parsed.weekly || parsed.monthly) {
    return parsed;
  }

  return parseDataSlotFormat(html);
}
