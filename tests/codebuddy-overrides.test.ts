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

const workspacePath = '/home/yuhao/project';
const legacyPath = '/home/yuhao/old-project';
const projectKey = crypto.createHash('md5').update(workspacePath).digest('hex');
const legacyKey = crypto.createHash('md5').update(legacyPath).digest('hex');

type MutableEnv = { uriScheme: string };
type MutableWorkspace = { workspaceFolders: unknown };

const project = (historyRoot: string, key: string, name: string): string => createProjectHistoryAt(
    path.join(historyRoot, key),
    [{ id: 'session-1', name }],
    [{ id: 'session-1', messages: [{ id: 'm1', role: 'user', content: 'question' }] }]
);

describe('CodeBuddy explicit path overrides', () => {
    let root: string;
    let vscodeHistory: string;
    let ideHistory: string;

    const setup = async (rawSettings: RawSettings, autoRoots: string[] = [root]): Promise<CodeBuddyReader> => {
        jest.spyOn(PlatformPaths, 'getCodeBuddyDataPaths').mockReturnValue(autoRoots);
        jest.spyOn(ConfigurationManager, 'getSettings').mockReturnValue(normalizeSettings(rawSettings));
        (vscode.env as unknown as MutableEnv).uriScheme = 'vscode';
        (vscode.workspace as unknown as MutableWorkspace).workspaceFolders = [
            { name: 'project', uri: { fsPath: workspacePath } }
        ];
        return new CodeBuddyReader();
    };

    beforeEach(async () => {
        root = await fsSync.promises.mkdtemp(path.join(os.tmpdir(), 'waylog-override-'));
        vscodeHistory = path.join(root, 'Data', 'uid', 'VSCode', 'uid', 'history');
        ideHistory = path.join(root, 'Data', 'uid', 'CodeBuddyIDE', 'uid', 'history');
        await fsSync.promises.mkdir(vscodeHistory, { recursive: true });
        await fsSync.promises.mkdir(ideHistory, { recursive: true });
    });

    afterEach(async () => {
        (vscode.env as unknown as MutableEnv).uriScheme = 'vscode';
        (vscode.workspace as unknown as MutableWorkspace).workspaceFolders = [];
        jest.restoreAllMocks();
        await fsSync.promises.rm(root, { recursive: true, force: true });
    });

    it('uses configured data roots instead of the automatic platform roots', async () => {
        const customRoot = path.join(root, 'custom');
        const customHistory = path.join(customRoot, 'VSCode', 'uid', 'history');
        project(customHistory, projectKey, '自定义根会话');
        const reader = await setup({ codeBuddyDataPaths: [customRoot] }, [path.join(root, 'empty')]);

        const workspaces = await reader.getWorkspaces();

        expect(workspaces).toHaveLength(1);
        expect(workspaces[0].dbPath).toBe(path.join(customHistory, projectKey));
    });

    it('uses an explicitly configured history root even from another channel', async () => {
        project(ideHistory, projectKey, 'IDE 会话');
        const reader = await setup({ codeBuddyHistoryDir: ideHistory });

        const workspaces = await reader.getWorkspaces();
        const sessions = await reader.getSessions(workspaces[0].dbPath as string);

        expect(sessions.map(session => session.title)).toEqual(['IDE 会话']);
    });

    it('accepts a project directory as the explicit history directory', async () => {
        const projectDir = project(vscodeHistory, projectKey, '精确目录会话');
        const reader = await setup({ codeBuddyHistoryDir: projectDir });

        const workspaces = await reader.getWorkspaces();
        const sessions = await reader.getSessions(workspaces[0].dbPath as string);

        expect(workspaces[0].dbPath).toBe(projectDir);
        expect(sessions.map(session => session.title)).toEqual(['精确目录会话']);
    });

    it('uses the configured workspace path after a folder rename', async () => {
        const legacyDir = project(vscodeHistory, legacyKey, '旧路径会话');
        const reader = await setup({ codeBuddyWorkspacePath: legacyPath });

        const workspaces = await reader.getWorkspaces();

        expect(workspaces).toHaveLength(1);
        expect(workspaces[0].path).toBe(workspacePath);
        expect(workspaces[0].dbPath).toBe(legacyDir);
    });
});
