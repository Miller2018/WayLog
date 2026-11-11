import * as crypto from 'crypto';
import * as fsSync from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { ConfigurationManager } from '../src/config/configuration';
import { normalizeSettings, RawSettings } from '../src/config/waylog-settings';
import { PlatformPaths } from '../src/utils/platform-paths';
import { CodeBuddyReader } from '../src/services/readers/codebuddy-reader';
import { createProjectHistoryAt } from './helpers/codebuddy-fixture';

const workspacePath = '/home/yuhao/src-miller-clouddesktop';
const projectKey = crypto.createHash('md5').update(workspacePath).digest('hex');

type MutableEnv = { uriScheme: string };
type MutableWorkspace = { workspaceFolders: unknown };

const message = (id: string, content: string) => [{ id, role: 'user' as const, content }];

describe('CodeBuddy workspace resolution', () => {
    let root: string;
    let vscodeHistory: string;
    let ideHistory: string;

    const setup = async (
        workspaceFolders: string[] = [workspacePath],
        rawSettings: RawSettings = {},
        uriScheme = 'vscode'
    ): Promise<CodeBuddyReader> => {
        jest.spyOn(PlatformPaths, 'getCodeBuddyDataPaths').mockReturnValue([root]);
        jest.spyOn(ConfigurationManager, 'getSettings').mockReturnValue(normalizeSettings(rawSettings));
        (vscode.env as unknown as MutableEnv).uriScheme = uriScheme;
        (vscode.workspace as unknown as MutableWorkspace).workspaceFolders = workspaceFolders.map(fsPath => ({
            name: path.basename(fsPath),
            uri: { fsPath }
        }));
        return new CodeBuddyReader();
    };

    beforeEach(async () => {
        root = await fsSync.promises.mkdtemp(path.join(os.tmpdir(), 'waylog-workspace-'));
        vscodeHistory = path.join(root, 'Data', 'uid', 'VSCode', 'uid', 'history');
        ideHistory = path.join(root, 'Data', 'uid', 'CodeBuddyIDE', 'uid', 'history');
        await fsSync.promises.mkdir(vscodeHistory, { recursive: true });
        await fsSync.promises.mkdir(ideHistory, { recursive: true });

        createProjectHistoryAt(
            path.join(vscodeHistory, projectKey),
            [{ id: 'session-a', name: '会话A' }, { id: 'session-b', name: '会话B' }],
            [
                { id: 'session-a', messages: message('m1', 'A question') },
                { id: 'session-b', messages: message('m1', 'B question') }
            ]
        );
        createProjectHistoryAt(
            path.join(ideHistory, projectKey),
            [{ id: 'session-c', name: '会话C' }],
            [{ id: 'session-c', messages: message('m1', 'C question') }]
        );
    });

    afterEach(async () => {
        (vscode.env as unknown as MutableEnv).uriScheme = 'vscode';
        (vscode.workspace as unknown as MutableWorkspace).workspaceFolders = [];
        jest.restoreAllMocks();
        await fsSync.promises.rm(root, { recursive: true, force: true });
    });

    it('resolves the current workspace to its project directory', async () => {
        const reader = await setup();

        const workspaces = await reader.getWorkspaces();

        expect(workspaces).toHaveLength(1);
        expect(workspaces[0].path).toBe(workspacePath);
        expect(workspaces[0].dbPath).toBe(path.join(vscodeHistory, projectKey));
        expect(workspaces[0].chatCount).toBe(2);
    });

    it('reads only the VS Code channel in auto mode', async () => {
        const reader = await setup();

        const sessions = await reader.getSessions((await reader.getWorkspaces())[0].dbPath as string);

        expect(sessions.map(session => session.title)).toEqual(expect.arrayContaining(['会话A', '会话B']));
        expect(sessions.map(session => session.title)).not.toContain('会话C');
    });

    it('reads only the CodeBuddy IDE channel in that IDE', async () => {
        const reader = await setup([workspacePath], {}, 'codebuddycn');

        const workspaces = await reader.getWorkspaces();
        const sessions = await reader.getSessions(workspaces[0].dbPath as string);

        expect(workspaces[0].dbPath).toBe(path.join(ideHistory, projectKey));
        expect(sessions.map(session => session.title)).toEqual(['会话C']);
    });

    it('merges and deduplicates sessions in all mode', async () => {
        createProjectHistoryAt(
            path.join(ideHistory, projectKey),
            [{ id: 'session-a', name: '会话A 更新' }, { id: 'session-c', name: '会话C' }],
            [
                { id: 'session-a', messages: message('m1', 'A question') },
                { id: 'session-c', messages: message('m1', 'C question') }
            ]
        );
        const reader = await setup([workspacePath], { codeBuddyChannel: 'all' });

        const workspaces = await reader.getWorkspaces();
        const sessions = await reader.getSessions(workspaces[0].dbPath as string);

        expect(workspaces[0].chatCount).toBe(3);
        expect(sessions).toHaveLength(3);
        expect(sessions.filter(session => session.id.endsWith('/session-a'))).toHaveLength(1);
    });

    it('returns no raw workspaces when the current workspace has no history', async () => {
        const reader = await setup(['/another/workspace']);

        expect(await reader.getWorkspaces()).toEqual([]);
    });

    it('accepts a history root and skips directories without a project index', async () => {
        const reader = await setup();
        await fsSync.promises.mkdir(path.join(vscodeHistory, 'not-a-project'));

        const sessions = await reader.getSessions(vscodeHistory);

        expect(sessions).toHaveLength(2);
    });

    it('matches Windows drive-letter variants', async () => {
        const windowsPath = 'C:\\Users\\Test\\project';
        const lowerCaseKey = crypto.createHash('md5').update('c:\\Users\\Test\\project').digest('hex');
        createProjectHistoryAt(
            path.join(vscodeHistory, lowerCaseKey),
            [{ id: 'session-win', name: 'Windows 会话' }],
            [{ id: 'session-win', messages: message('m1', 'Windows question') }]
        );
        const reader = await setup([windowsPath]);

        const workspaces = await reader.getWorkspaces();

        expect(workspaces).toHaveLength(1);
        expect(workspaces[0].dbPath).toBe(path.join(vscodeHistory, lowerCaseKey));
    });

    it('merges history from every folder of a multi-root workspace', async () => {
        const secondPath = '/home/yuhao/second-project';
        const secondKey = crypto.createHash('md5').update(secondPath).digest('hex');
        createProjectHistoryAt(
            path.join(vscodeHistory, secondKey),
            [{ id: 'session-d', name: '会话D' }],
            [{ id: 'session-d', messages: message('m1', 'D question') }]
        );
        const reader = await setup([workspacePath, secondPath]);

        const workspaces = await reader.getWorkspaces();
        const sessions = await reader.getSessions(workspaces[0].dbPath as string);

        expect(workspaces).toHaveLength(1);
        expect(workspaces[0].path).toBe(workspacePath);
        expect(sessions).toHaveLength(3);
    });
});
