import * as fs from 'fs';
import * as path from 'path';

export interface FixtureMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

export interface FixtureConversation {
    id: string;
    name?: string;
    createdAt?: string;
}

export interface FixtureSession {
    id: string;
    messages: FixtureMessage[];
}

export function createProjectHistoryAt(
    projectDir: string,
    conversations: FixtureConversation[],
    sessions: FixtureSession[]
): string {
    fs.mkdirSync(projectDir, { recursive: true });

    fs.writeFileSync(path.join(projectDir, 'index.json'), JSON.stringify({
        conversations: conversations.map(conv => ({
            id: conv.id,
            type: 'chat',
            name: conv.name || '',
            createdAt: conv.createdAt || '2026-01-10T11:04:56.000Z',
            lastMessageAt: conv.createdAt || '2026-01-10T11:04:56.000Z'
        })),
        current: ''
    }));

    for (const session of sessions) {
        const sessionDir = path.join(projectDir, session.id);
        fs.mkdirSync(path.join(sessionDir, 'messages'), { recursive: true });
        fs.writeFileSync(path.join(sessionDir, 'index.json'), JSON.stringify({
            messages: session.messages.map(msg => ({ id: msg.id, role: msg.role, type: 'text' }))
        }));

        for (const msg of session.messages) {
            fs.writeFileSync(
                path.join(sessionDir, 'messages', `${msg.id}.json`),
                JSON.stringify({
                    id: msg.id,
                    role: msg.role,
                    message: JSON.stringify({
                        role: msg.role,
                        content: [{ type: 'text', text: msg.content }],
                        model: 'test-model'
                    })
                })
            );
        }
    }

    return projectDir;
}

export function createProjectHistory(
    root: string,
    conversations: FixtureConversation[],
    sessions: FixtureSession[]
): string {
    return createProjectHistoryAt(path.join(root, 'a'.repeat(32)), conversations, sessions);
}
