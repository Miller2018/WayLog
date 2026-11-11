import * as fs from 'fs/promises';
import * as path from 'path';
import * as vscode from 'vscode';
import { Logger } from '../utils/logger';
import { ConfigurationManager } from '../config/configuration';
import { DEFAULT_FILENAME_TEMPLATE } from '../config/waylog-settings';
import { ChatSession } from './readers/types';

/**
 * Slugify text to create safe filename (matches waylog-cli logic)
 */
function slugify(text: string): string {
    // Take first 50 chars safely (Unicode aware)
    const truncated = Array.from(text).slice(0, 50).join('');

    // Convert to lowercase alphanumeric with hyphens
    // Using Unicode property escapes to support generic language characters (including Chinese)
    // \p{L} matches any Unicode letter, \p{N} matches any Unicode number
    const slug = truncated
        .split('')
        .map(c => /[\p{L}\p{N}]/u.test(c) ? c.toLowerCase() : '-')
        .join('');

    // Collapse multiple hyphens and trim
    const cleanSlug = slug
        .replace(/-+/g, '-')  // Collapse multiple hyphens
        .replace(/^-+|-+$/g, ''); // Trim leading/trailing hyphens

    return cleanSlug || 'new-chat';
}

/** Keep Unicode letters and digits while replacing characters unsafe for filenames. */
export function sanitizeFilenameComponent(value: string, maxLength = 50): string {
    return Array.from(value)
        .filter(char => char.charCodeAt(0) >= 32)
        .map(char => /[\p{L}\p{N}_]/u.test(char) ? char : '_')
        .join('')
        .slice(0, maxLength);
}

/** Sanitize a whole filename, including Windows reserved names. */
export function sanitizeFilename(filename: string): string {
    let cleaned = Array.from(filename)
        .map(char => char.charCodeAt(0) < 32 || /[<>:"/\\|?*]/.test(char) ? '_' : char)
        .join('')
        .replace(/[. ]+$/g, '');

    const stem = cleaned.toLowerCase().endsWith('.md') ? cleaned.slice(0, -3) : cleaned;
    if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(stem)) {
        cleaned = `_${cleaned}`;
    }
    return cleaned;
}

function generateClaudeFilename(session: ChatSession, date: Date): string {
    // Format: YYYY-MM-DD_HH-MM-SSZ-claude-{slug}.md (waylog-cli compatible)
    const timestamp = date.toISOString()
        .replace(/T/, '_')
        .replace(/\.\d{3}Z$/, 'Z')
        .replace(/:/g, '-');

    const firstUserMessage = session.messages.find(m => m.role === 'user');
    const slug = firstUserMessage
        ? slugify(firstUserMessage.content)
        : session.id || 'new-chat';

    return `${timestamp}-claude-${slug}.md`;
}

/**
 * Generate a filename from the configured template.
 * The default template preserves the original formats, including Claude's
 * waylog-cli compatible name; an explicit template overrides every provider.
 */
export function generateFilename(session: ChatSession, template?: string): string {
    const date = new Date(session.timestamp);
    const effectiveTemplate = template || ConfigurationManager.getSettings().filenameTemplate;

    if (effectiveTemplate === DEFAULT_FILENAME_TEMPLATE && session.source.toLowerCase() === 'claude') {
        return generateClaudeFilename(session, date);
    }

    const iso = date.toISOString();
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    const replacements: Array<[string, string]> = [
        ['{date}', iso.split('T')[0]],
        ['{time}', iso.split('T')[1].slice(0, 5).replace(':', '-')],
        ['{title}', sanitizeFilenameComponent(session.title)],
        ['{source}', sanitizeFilenameComponent(session.source)],
        ['{workspace}', sanitizeFilenameComponent(workspaceRoot ? path.basename(workspaceRoot) : '')],
        ['{sessionId}', sanitizeFilenameComponent(session.id, 16)]
    ];

    let filename = effectiveTemplate;
    for (const [placeholder, value] of replacements) {
        filename = filename.split(placeholder).join(value);
    }

    if (!/\.md$/i.test(filename)) {
        filename += '.md';
    }
    return sanitizeFilename(filename);
}

/**
 * Find existing exported file for a given session
 * Simply checks if file with expected name exists
 */
export async function findExistingFile(session: ChatSession, historyDir: string): Promise<string | null> {
    try {
        const filename = generateFilename(session);
        const filepath = path.join(historyDir, filename);

        // Check if file exists
        try {
            await fs.access(filepath);
            const stats = await fs.stat(filepath);
            Logger.debug(`[WayLog] Found existing file: ${filename} (size: ${stats.size} bytes)`);
            return filepath;
        } catch {
            // File doesn't exist or is inaccessible
            return null;
        }
    } catch (error) {
        Logger.error('[WayLog] Error finding existing file', error);
        return null;
    }
}

/**
 * Extract message count from exported markdown file
 * Counts the number of message separators (---) in the file
 */
export async function getFileMessageCount(filepath: string): Promise<number> {
    try {
        const content = await fs.readFile(filepath, 'utf8');

        // Count message separators
        // Each message ends with "\n---\n"
        const separators = content.match(/\n---\n/g);
        const count = separators ? separators.length : 0;

        Logger.debug(`[WayLog] File ${path.basename(filepath)} has ${count} messages`);
        return count;
    } catch (error) {
        Logger.error('[WayLog] Error reading file message count', error);
        return 0;
    }
}

/**
 * Extract session ID from file header
 */
export function extractSessionIdFromHeader(header: string): string | null {
    const match = header.match(/Session ([a-f0-9-]+)/);
    return match ? match[1] : null;
}
