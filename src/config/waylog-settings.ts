import { CodeBuddyChannelMode } from '../services/readers/codebuddy-channel';

export const DEFAULT_OUTPUT_DIR = '.waylog/history';
export const DEFAULT_FILENAME_TEMPLATE = '{date}_{time}Z-{title}.md';
export const DEFAULT_AUTO_SAVE_INTERVAL_SECONDS = 60;

const VALID_CHANNEL_MODES: CodeBuddyChannelMode[] = ['auto', 'VSCode', 'CodeBuddyIDE', 'all'];

export interface WaylogSettings {
    enable: boolean;
    autoSave: boolean;
    autoSaveIntervalSeconds: number;
    codeBuddyChannel: CodeBuddyChannelMode;
    codeBuddyDataPaths: string[];
    codeBuddyHistoryDir: string;
    codeBuddyWorkspacePath: string;
    outputDir: string;
    filenameTemplate: string;
}

export interface RawSettings {
    enable?: unknown;
    autoSave?: unknown;
    autoSaveInterval?: unknown;
    codeBuddyChannel?: unknown;
    codeBuddyDataPaths?: unknown;
    codeBuddyHistoryDir?: unknown;
    codeBuddyWorkspacePath?: unknown;
    outputDir?: unknown;
    filenameTemplate?: unknown;
}

function textOrDefault(value: unknown, fallback: string): string {
    return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function optionalText(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

/** Apply defaults and validate user overrides so callers never see invalid values. */
export function normalizeSettings(raw: RawSettings = {}): WaylogSettings {
    const interval = typeof raw.autoSaveInterval === 'number'
        && Number.isFinite(raw.autoSaveInterval)
        && raw.autoSaveInterval > 0
        ? Math.max(10, Math.min(3600, Math.round(raw.autoSaveInterval)))
        : DEFAULT_AUTO_SAVE_INTERVAL_SECONDS;

    const channel = raw.codeBuddyChannel as CodeBuddyChannelMode;

    return {
        enable: typeof raw.enable === 'boolean' ? raw.enable : true,
        autoSave: typeof raw.autoSave === 'boolean' ? raw.autoSave : true,
        autoSaveIntervalSeconds: interval,
        codeBuddyChannel: VALID_CHANNEL_MODES.includes(channel) ? channel : 'auto',
        codeBuddyDataPaths: Array.isArray(raw.codeBuddyDataPaths)
            ? raw.codeBuddyDataPaths
                .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
                .map(value => value.trim())
            : [],
        codeBuddyHistoryDir: optionalText(raw.codeBuddyHistoryDir),
        codeBuddyWorkspacePath: optionalText(raw.codeBuddyWorkspacePath),
        outputDir: textOrDefault(raw.outputDir, DEFAULT_OUTPUT_DIR),
        filenameTemplate: textOrDefault(raw.filenameTemplate, DEFAULT_FILENAME_TEMPLATE)
    };
}
