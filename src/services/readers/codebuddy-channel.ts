export type CodeBuddyChannel = 'VSCode' | 'CodeBuddyIDE';
export type CodeBuddyChannelMode = 'auto' | CodeBuddyChannel | 'all';

export interface IdeEnvironment {
    appName?: string;
    uriScheme?: string;
    appRoot?: string;
}

const hasCodeBuddySignal = (value: string): boolean => /codebuddy|buddycn/.test(value);
const hasVSCodeSignal = (value: string): boolean => /visual studio code|vscode/.test(value);

/**
 * Detect which CodeBuddy product owns the current extension host.
 * The product identity is taken from the IDE itself, not from the data folders,
 * so a VS Code host never reads CodeBuddy IDE history and vice versa.
 */
export function detectCodeBuddyChannel(env: IdeEnvironment): CodeBuddyChannel | undefined {
    const primary = [env.uriScheme, env.appName]
        .filter((value): value is string => Boolean(value))
        .map(value => value.toLowerCase());

    if (primary.some(hasCodeBuddySignal)) {
        return 'CodeBuddyIDE';
    }
    if (primary.some(hasVSCodeSignal)) {
        return 'VSCode';
    }

    const appRoot = (env.appRoot || '').toLowerCase();
    if (hasCodeBuddySignal(appRoot)) {
        return 'CodeBuddyIDE';
    }
    if (hasVSCodeSignal(appRoot)) {
        return 'VSCode';
    }

    return undefined;
}

/**
 * Resolve the configured channel mode to a concrete channel (or all channels).
 * An unrecognized host falls back to the VS Code layout, which is where the
 * CodeBuddy extension writes its history.
 */
export function resolveChannelMode(
    mode: CodeBuddyChannelMode,
    env: IdeEnvironment
): CodeBuddyChannel | 'all' {
    if (mode === 'all') {
        return 'all';
    }
    if (mode !== 'auto') {
        return mode;
    }
    return detectCodeBuddyChannel(env) || 'VSCode';
}

/** Extract the product channel from a history directory path. */
export function getHistoryPathChannel(historyPath: string): CodeBuddyChannel | undefined {
    const parts = historyPath.split(/[\\/]+/);
    for (let index = parts.length - 1; index >= 0; index--) {
        const segment = parts[index].toLowerCase();
        if (segment === 'codebuddyide') {
            return 'CodeBuddyIDE';
        }
        if (segment === 'vscode') {
            return 'VSCode';
        }
    }
    return undefined;
}

/**
 * Keep only the history roots belonging to the selected channel.
 * Roots without a recognizable channel (legacy paths, user overrides) are kept.
 */
export function filterHistoryPathsByChannel(
    historyPaths: string[],
    mode: CodeBuddyChannelMode,
    env: IdeEnvironment
): string[] {
    const channel = resolveChannelMode(mode, env);
    if (channel === 'all') {
        return historyPaths;
    }
    return historyPaths.filter(historyPath => {
        const pathChannel = getHistoryPathChannel(historyPath);
        return pathChannel === undefined || pathChannel === channel;
    });
}
