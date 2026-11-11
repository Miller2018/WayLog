import * as vscode from 'vscode';
import { ConfigKey, ConfigurationManager } from '../src/config/configuration';
import { DEFAULT_FILENAME_TEMPLATE, normalizeSettings } from '../src/config/waylog-settings';
import {
    generateFilename,
    sanitizeFilenameComponent
} from '../src/services/waylog-index';
import { ChatSession } from '../src/services/readers/types';

const baseTimestamp = new Date('2026-01-10T11:04:56.123Z').getTime();

function makeSession(overrides: Partial<ChatSession> = {}): ChatSession {
    return {
        id: 'test-session-123',
        title: 'My Chat',
        description: '',
        timestamp: baseTimestamp,
        source: 'Cursor',
        messages: [{ role: 'user', content: 'How do I implement a CLI tool?' }],
        ...overrides
    };
}

type MutableWorkspace = { workspaceFolders: unknown };

describe('filename templates', () => {
    beforeEach(() => {
        (vscode.workspace as unknown as MutableWorkspace).workspaceFolders = [];
    });

    afterEach(() => {
        jest.restoreAllMocks();
        (vscode.workspace as unknown as MutableWorkspace).workspaceFolders = [];
    });

    it('keeps the original default format, including CJK titles', () => {
        const session = makeSession({ title: '中文标题 with 空格' });

        expect(generateFilename(session, DEFAULT_FILENAME_TEMPLATE))
            .toBe('2026-01-10_11-04Z-中文标题_with_空格.md');
    });

    it('keeps the waylog-cli Claude format with the default template', () => {
        const session = makeSession({ source: 'Claude', title: 'Test Session' });

        expect(generateFilename(session, DEFAULT_FILENAME_TEMPLATE))
            .toBe('2026-01-10_11-04-56Z-claude-how-do-i-implement-a-cli-tool.md');
    });

    it('uses the configured template when no argument is passed', () => {
        jest.spyOn(ConfigurationManager, 'getSettings').mockReturnValue(normalizeSettings({
            [ConfigKey.FilenameTemplate]: '{date}-{source}-{title}.md'
        }));

        expect(generateFilename(makeSession())).toBe('2026-01-10-Cursor-My_Chat.md');
    });

    it('lets an explicit template override the Claude format', () => {
        const session = makeSession({ source: 'Claude', title: 'Test Session' });

        expect(generateFilename(session, '{title}-{sessionId}.md'))
            .toBe('Test_Session-test_session_123.md');
    });

    it('appends the markdown extension when the template omits it', () => {
        expect(generateFilename(makeSession(), '{title}')).toBe('My_Chat.md');
    });

    it('sanitizes unsafe characters and Windows reserved names', () => {
        expect(generateFilename(makeSession(), 'bad:name?{title}.md')).toBe('bad_name_My_Chat.md');
        expect(generateFilename(makeSession(), 'CON')).toBe('_CON.md');
    });

    it('supports Unicode letters while keeping the legacy underscore mapping', () => {
        expect(sanitizeFilenameComponent('café')).toBe('café');
        expect(sanitizeFilenameComponent('日本語')).toBe('日本語');
        expect(sanitizeFilenameComponent('a-b')).toBe('a_b');
    });

    it('resolves the workspace placeholder from the open folder', () => {
        (vscode.workspace as unknown as MutableWorkspace).workspaceFolders = [
            { uri: { fsPath: '/home/yuhao/my-project' } }
        ];

        expect(generateFilename(makeSession(), '{workspace}-{title}.md'))
            .toBe('my_project-My_Chat.md');
    });
});
