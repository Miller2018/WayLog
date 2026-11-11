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
