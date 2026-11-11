import * as os from 'os';
import * as path from 'path';
import { DEFAULT_OUTPUT_DIR } from '../config/waylog-settings';

export interface OutputDirContext {
    workspaceRoot: string;
    source?: string;
    date?: Date;
}

export function sanitizePathSegment(value: string): string {
    const cleaned = Array.from(value.trim())
        .map(char => char.charCodeAt(0) < 32 || /[<>:"/\\|?*\s]/.test(char) ? '_' : char)
        .join('')
        .replace(/_+/g, '_')
        .replace(/^\.+|\.+$/g, '');
    return cleaned || 'unknown';
}

/**
 * Resolve the configured output directory.
 * Relative paths are anchored at the workspace, ${workspaceFolder} is expanded,
 * and {source}/{date}/{year}/{month}/{workspace} allow classified subfolders.
 */
export function resolveOutputDir(template: string, context: OutputDirContext): string {
    const now = context.date || new Date();
    const iso = now.toISOString();
    const replacements: Array<[string, string]> = [
        ['{workspace}', sanitizePathSegment(path.basename(context.workspaceRoot))],
        ['{source}', sanitizePathSegment(context.source || '')],
        ['{date}', iso.slice(0, 10)],
        ['{year}', iso.slice(0, 4)],
        ['{month}', iso.slice(5, 7)]
    ];

    let resolved = (template || DEFAULT_OUTPUT_DIR).trim() || DEFAULT_OUTPUT_DIR;
    resolved = resolved.replace(/\$\{workspaceFolder\}/g, context.workspaceRoot);
    for (const [placeholder, value] of replacements) {
        resolved = resolved.split(placeholder).join(value);
    }

    if (resolved === '~' || resolved.startsWith('~/') || resolved.startsWith('~\\')) {
        resolved = path.join(os.homedir(), resolved.slice(2));
    }

    const isAbsolutePath = path.isAbsolute(resolved)
        || /^[a-zA-Z]:[\\/]/.test(resolved)
        || resolved.startsWith('\\\\');

    return isAbsolutePath ? path.normalize(resolved) : path.join(context.workspaceRoot, resolved);
}
