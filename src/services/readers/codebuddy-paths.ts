import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface HistoryDiscoveryOptions {
    maxDepth?: number;
    skippedDirectories?: string[];
}

const DEFAULT_SKIPPED_DIRECTORIES = ['node_modules', '.git', 'Cache', 'CachedData', 'logs', 'extensions'];

/**
 * Find every history directory below the CodeBuddy data roots.
 * CodeBuddy uses several layouts (<uid>/VSCode/<uid>/history, base64 encoded
 * parent folders, legacy symlinks), so discovery is structural rather than
 * based on a fixed directory depth or name.
 */
export async function discoverHistoryRoots(
    dataRoots: string[],
    options: HistoryDiscoveryOptions = {}
): Promise<string[]> {
    const maxDepth = options.maxDepth ?? 8;
    const skipped = new Set(options.skippedDirectories ?? DEFAULT_SKIPPED_DIRECTORIES);
    const found = new Set<string>();

    const addHistoryDirectory = async (directory: string): Promise<void> => {
        try {
            const stats = await fs.stat(directory);
            if (!stats.isDirectory()) {
                return;
            }
            const resolved = await fs.realpath(directory);
            found.add(resolved);
        } catch {
            // Inaccessible or broken links are ignored; other roots still work.
        }
    };

    const walk = async (directory: string, depth: number): Promise<void> => {
        if (depth > maxDepth) {
            return;
        }

        let entries;
        try {
            entries = await fs.readdir(directory, { withFileTypes: true });
        } catch {
            return;
        }

        for (const entry of entries) {
            const fullPath = path.join(directory, entry.name);
            if (entry.name === 'history') {
                await addHistoryDirectory(fullPath);
                continue;
            }
            // Regular directories only: following arbitrary symlinks could loop.
            if (!entry.isDirectory() || skipped.has(entry.name)) {
                continue;
            }
            await walk(fullPath, depth + 1);
        }
    };

    await Promise.all(dataRoots.map(root => walk(root, 0)));
    return Array.from(found);
}

/**
 * Compute the directory names CodeBuddy may use for a workspace.
 * The original absolute path wins; case, drive letter and separator variants
 * are fallbacks for Windows hosts that report paths differently.
 */
export function getWorkspaceKeyCandidates(workspacePath: string): string[] {
    const trimmed = workspacePath.replace(/[\\/]+$/, '');
    const variants = new Set<string>([
        workspacePath,
        trimmed,
        path.normalize(workspacePath)
    ]);

    if (/^[a-zA-Z]:[\\/]/.test(trimmed)) {
        variants.add(trimmed[0].toLowerCase() + trimmed.slice(1));
        variants.add(trimmed[0].toUpperCase() + trimmed.slice(1));
    }
    variants.add(trimmed.replace(/\//g, '\\'));
    variants.add(trimmed.replace(/\\/g, '/'));

    const keys = new Set<string>();
    for (const variant of variants) {
        keys.add(crypto.createHash('md5').update(variant).digest('hex'));
    }
    return Array.from(keys);
}

/** A real project directory has a project-level index with conversations. */
export async function isProjectDirectory(directory: string): Promise<boolean> {
    try {
        const stats = await fs.stat(directory);
        if (!stats.isDirectory()) {
            return false;
        }
        const raw = await fs.readFile(path.join(directory, 'index.json'), 'utf8');
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed.conversations);
    } catch {
        return false;
    }
}

export async function findProjectDirectories(historyRoots: string[], keys: string[]): Promise<string[]> {
    const found: string[] = [];
    for (const historyRoot of historyRoots) {
        for (const key of keys) {
            const directory = path.join(historyRoot, key);
            if (!found.includes(directory) && await isProjectDirectory(directory)) {
                found.push(directory);
            }
        }
    }
    return found;
}

export async function findChildProjectDirectories(historyRoot: string): Promise<string[]> {
    let entries;
    try {
        entries = await fs.readdir(historyRoot, { withFileTypes: true });
    } catch {
        return [];
    }

    const found: string[] = [];
    for (const entry of entries) {
        if (!entry.isDirectory() && !entry.isSymbolicLink()) {
            continue;
        }
        const directory = path.join(historyRoot, entry.name);
        if (await isProjectDirectory(directory)) {
            found.push(directory);
        }
    }
    return found;
}
