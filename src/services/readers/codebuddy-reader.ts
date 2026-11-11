import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

import { ChatHistoryReader, ChatSession, ChatMessage, WorkspaceInfo } from './types';
import { Logger } from '../../utils/logger';
import { PlatformPaths } from '../../utils/platform-paths';
import { ConfigurationManager } from '../../config/configuration';
import {
    discoverHistoryRoots,
    getWorkspaceKeyCandidates,
    findProjectDirectories,
    findChildProjectDirectories,
    isProjectDirectory
} from './codebuddy-paths';
import { filterHistoryPathsByChannel, IdeEnvironment } from './codebuddy-channel';

interface CodeBuddyProjectIndex {
    conversations: {
        id: string;
        type: string;
        name: string;
        createdAt: string;
        lastMessageAt: string;
    }[];
    current: string;
}

interface CodeBuddySessionIndex {
    messages: {
        id: string;
        role: 'user' | 'assistant';
        type: string;
    }[];
}

interface CodeBuddyMessage {
    role: 'user' | 'assistant';
    message: string; // Stringified JSON
    id: string;
    extra?: string;
}

export class CodeBuddyReader implements ChatHistoryReader {
    public readonly name = 'Tencent CodeBuddy';
    public readonly description = '';
    public readonly extensionId = 'tencent-cloud.coding-copilot';
    private initPromise: Promise<void> | null = null;
    private historyPaths: string[] = [];
    private projectDirsByPath = new Map<string, string[]>();

    constructor() {
        // Lightweight initialization - no I/O here
    }

    private async ensureInitialized(): Promise<void> {
        if (this.historyPaths.length > 0) {
            return;
        }
        if (this.initPromise) {
            return this.initPromise;
        }

        const settings = ConfigurationManager.getSettings();
        const roots = PlatformPaths.getCodeBuddyDataPaths();
        const env: IdeEnvironment = {
            appName: vscode.env.appName,
            uriScheme: vscode.env.uriScheme,
            appRoot: vscode.env.appRoot
        };

        this.initPromise = (async () => {
            const discovered = await discoverHistoryRoots(roots);
            this.historyPaths = filterHistoryPathsByChannel(discovered, settings.codeBuddyChannel, env);
            Logger.info(`[CodeBuddyReader] Found ${this.historyPaths.length} history directories (${settings.codeBuddyChannel} channel)`);
        })();

        try {
            await this.initPromise;
        } catch (error) {
            this.initPromise = null;
            Logger.error('[CodeBuddyReader] Failed to discover history directories', error);
        } finally {
            // CodeBuddy may create its history folder after extension startup.
            if (this.historyPaths.length === 0) {
                this.initPromise = null;
            }
        }
    }

    async isAvailable(): Promise<boolean> {
        await this.ensureInitialized();
        return this.historyPaths.length > 0;
    }

    async getWorkspaces(): Promise<WorkspaceInfo[]> {
        await this.ensureInitialized();

        const folders = vscode.workspace.workspaceFolders?.map(folder => folder.uri.fsPath) || [];
        const rootPath = folders[0] || vscode.workspace.rootPath;
        if (!rootPath) {
            return [];
        }

        const workspacePaths = folders.length > 0 ? folders : [rootPath];
        const keys = new Set<string>();
        for (const workspacePath of workspacePaths) {
            for (const key of getWorkspaceKeyCandidates(workspacePath)) {
                keys.add(key);
            }
        }

        const projectDirs = await findProjectDirectories(this.historyPaths, Array.from(keys));
        if (projectDirs.length === 0) {
            Logger.info(`[CodeBuddyReader] No CodeBuddy history found for ${rootPath}`);
            return [];
        }

        const dbPath = projectDirs[0];
        this.projectDirsByPath.set(dbPath, projectDirs);
        const sessions = await this.getSessions(dbPath);

        return [{
            id: `codebuddy-${path.basename(dbPath)}`,
            name: `CodeBuddy (${path.basename(rootPath)})`,
            path: rootPath,
            dbPath,
            lastModified: sessions.length > 0 ? Math.max(...sessions.map(s => s.timestamp)) : Date.now(),
            chatCount: sessions.length,
            source: this.name
        }];
    }

    async getSessions(workspacePath: string): Promise<ChatSession[]> {
        const sessions: ChatSession[] = [];

        try {
            const merged = this.projectDirsByPath.get(workspacePath);
            const projectDirs = merged || (await isProjectDirectory(workspacePath)
                ? [workspacePath]
                : await findChildProjectDirectories(workspacePath));

            for (const projectDir of projectDirs) {
                await this.scanProjectDir(projectDir, sessions);
            }
        } catch (e) {
            Logger.error(`[CodeBuddyReader] Failed to read sessions from ${workspacePath}`, e);
        }

        // The same conversation can exist in several history roots (old/new
        // layouts or both product channels); keep its freshest copy.
        const unique = new Map<string, ChatSession>();
        for (const session of sessions) {
            const existing = unique.get(session.id);
            if (!existing || (session.lastUpdatedAt || 0) > (existing.lastUpdatedAt || 0)) {
                unique.set(session.id, session);
            }
        }
        return Array.from(unique.values()).sort((a, b) => b.timestamp - a.timestamp);
    }

    private async scanProjectDir(projectPath: string, sessions: ChatSession[]) {
        try {
            // Read project-level index.json to get stable timestamps
            const projectIndexPath = path.join(projectPath, 'index.json');
            let projectIndex: CodeBuddyProjectIndex | undefined;

            if (fs.existsSync(projectIndexPath)) {
                try {
                    projectIndex = JSON.parse(fs.readFileSync(projectIndexPath, 'utf-8'));
                } catch (e) {
                    Logger.error(`[CodeBuddyReader] Failed to parse project index: ${projectIndexPath}`, e);
                }
            }

            // Map session ID to creation time and the IDE-assigned conversation name
            const sessionTimestamps = new Map<string, number>();
            const sessionNames = new Map<string, string>();
            if (projectIndex && projectIndex.conversations) {
                for (const conv of projectIndex.conversations) {
                    sessionTimestamps.set(conv.id, new Date(conv.createdAt).getTime());
                    if (conv.name) {
                        sessionNames.set(conv.id, conv.name);
                    }
                }
            }

            const sessionDirs = fs.readdirSync(projectPath);
            for (const sessionDir of sessionDirs) {
                const sessionPath = path.join(projectPath, sessionDir);
                if (!fs.statSync(sessionPath).isDirectory()) continue;

                // Check for session level index.json
                const indexPath = path.join(sessionPath, 'index.json');
                if (fs.existsSync(indexPath)) {
                    const messages = await this.readMessages(sessionPath);
                    if (messages.length === 0) continue;

                    const stats = fs.statSync(indexPath);

                    // Use stable creation time if available, otherwise fallback to mtime
                    const creationTime = sessionTimestamps.get(sessionDir) || stats.mtimeMs;

                    sessions.push({
                        id: `${path.basename(projectPath)}/${sessionDir}`, // Unique ID: MD5/SessionID
                        title: sessionNames.get(sessionDir) || this.generateTitle(messages),
                        description: `${messages.length} messages`,
                        timestamp: creationTime,
                        lastUpdatedAt: stats.mtimeMs,
                        messages: messages,
                        source: this.name
                    });
                }
            }
        } catch (e) {
            // ignore access errors
        }
    }

    private generateTitle(messages: ChatMessage[]): string {
        // Find first valid user message that isn't just metadata
        for (const msg of messages) {
            if (msg.role === 'user') {
                const clean = msg.content.trim();
                if (clean.length > 0) {
                    return clean.slice(0, 50).replace(/\n/g, ' ');
                }
            }
        }
        return 'New Chat';
    }

    private async readMessages(sessionPath: string): Promise<ChatMessage[]> {
        const indexPath = path.join(sessionPath, 'index.json');

        try {
            const indexContent = fs.readFileSync(indexPath, 'utf-8');
            const indexData: CodeBuddySessionIndex = JSON.parse(indexContent);
            const messagesPath = path.join(sessionPath, 'messages');

            const messages: ChatMessage[] = [];

            if (!indexData.messages) return [];

            for (const msgRef of indexData.messages) {
                const msgFile = path.join(messagesPath, `${msgRef.id}.json`);
                if (fs.existsSync(msgFile)) {
                    try {
                        const msgRaw: CodeBuddyMessage = JSON.parse(fs.readFileSync(msgFile, 'utf-8'));

                        // message field is a stringified JSON
                        let msgContent: any;
                        try {
                            msgContent = JSON.parse(msgRaw.message);
                        } catch {
                            msgContent = { content: msgRaw.message };
                        }

                        let text = '';
                        // CodeBuddy structure: content can be array of {type:'text', text:'...'} or string
                        if (msgContent && Array.isArray(msgContent.content)) {
                            text = msgContent.content
                                .filter((c: any) => c.type === 'text')
                                .map((c: any) => c.text)
                                .join('\n');
                        } else if (msgContent && typeof msgContent.content === 'string') {
                            text = msgContent.content;
                        } else if (typeof msgContent === 'string') {
                            text = msgContent;
                        }

                        text = this.cleanContent(text);

                        if (text) {
                            messages.push({
                                role: msgRef.role as 'user' | 'assistant',
                                content: text,
                                timestamp: fs.statSync(msgFile).mtimeMs,
                                metadata: {
                                    model: msgContent.model || undefined
                                }
                            });
                        }
                    } catch (e) {
                        // Skip malformed individual messages
                    }
                }
            }

            return messages;
        } catch (e) {
            return [];
        }
    }

    private cleanContent(content: string): string {
        if (!content) return '';
        let cleaned = content;
        cleaned = cleaned.replace(/<user_info>[\s\S]*?<\/user_info>/g, '');
        cleaned = cleaned.replace(/<rules>[\s\S]*?<\/rules>/g, '');
        cleaned = cleaned.replace(/<project_context>[\s\S]*?<\/project_context>/g, '');
        cleaned = cleaned.replace(/<project_layout>[\s\S]*?<\/project_layout>/g, '');
        cleaned = cleaned.replace(/<system_reminder>[\s\S]*?<\/system_reminder>/g, '');
        cleaned = cleaned.replace(/<user_query>/g, '');
        cleaned = cleaned.replace(/<\/user_query>/g, '');

        // Remove additional metadata tags
        cleaned = cleaned.replace(/<additional_data>[\s\S]*?<\/additional_data>/g, '');
        cleaned = cleaned.replace(/<currently_opened_file>[\s\S]*?<\/currently_opened_file>/g, '');

        return cleaned.trim();
    }
}
