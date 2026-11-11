import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { ConfigurationManager } from '../src/config/configuration';
import { normalizeSettings } from '../src/config/waylog-settings';
import { PlatformPaths } from '../src/utils/platform-paths';
import { discoverHistoryRoots } from '../src/services/readers/codebuddy-paths';
import { CodeBuddyReader } from '../src/services/readers/codebuddy-reader';

const workspacePath = '/home/yuhao/src-miller-clouddesktop';
const projectKey = crypto.createHash('md5').update(workspacePath).digest('hex');

type MutableEnv = { uriScheme: string };
type InitializedReader = { historyPaths: string[]; ensureInitialized(): Promise<void> };

interface Tree {
    ide: string;
    vscode: string;
    encoded: string;
    noise: string;
}

async function buildTree(root: string): Promise<Tree> {
    const ide = path.join(root, 'Data', 'uid', 'CodeBuddyIDE', 'uid', 'history');
    const vscodeRoot = path.join(root, 'Data', 'uid', 'VSCode', 'uid', 'history');
    const encoded = path.join(root, 'Data', 'uid', 'VSCode', 'L2hvbWUveXhv', 'history');
    const noise = path.join(root, 'node_modules', 'pkg', 'history');

    for (const directory of [ide, vscodeRoot, encoded, noise]) {
        await fs.mkdir(path.join(directory, projectKey), { recursive: true });
        await fs.writeFile(path.join(directory, 'index.json'), JSON.stringify({ conversations: [], current: '' }));
    }

    const legacy = path.join(root, 'legacy');
    await fs.mkdir(legacy, { recursive: true });
    await fs.symlink(ide, path.join(legacy, 'history'), 'dir');

    return { ide, vscode: vscodeRoot, encoded, noise };
}

describe('CodeBuddy history discovery', () => {
    let root: string;

    beforeEach(async () => {
        root = await fs.mkdtemp(path.join(os.tmpdir(), 'waylog-discovery-'));
        (vscode.env as unknown as MutableEnv).uriScheme = 'vscode';
    });

    afterEach(async () => {
        (vscode.env as unknown as MutableEnv).uriScheme = 'vscode';
        jest.restoreAllMocks();
        await fs.rm(root, { recursive: true, force: true });
    });

    it('finds every layout, skips node_modules and deduplicates symlinks', async () => {
        const tree = await buildTree(root);

        const roots = await discoverHistoryRoots([root]);

        expect(roots).toHaveLength(3);
        expect(roots).toEqual(expect.arrayContaining([tree.ide, tree.vscode, tree.encoded]));
        expect(roots).not.toContain(tree.noise);
    });

    const initialize = async (channel: string, uriScheme: string): Promise<string[]> => {
        jest.spyOn(PlatformPaths, 'getCodeBuddyDataPaths').mockReturnValue([root]);
        const settings = normalizeSettings({ codeBuddyChannel: channel });
        expect(settings.codeBuddyChannel).toBe(channel);
        jest.spyOn(ConfigurationManager, 'getSettings').mockReturnValue(settings);
        (vscode.env as unknown as MutableEnv).uriScheme = uriScheme;

        const reader = new CodeBuddyReader() as unknown as InitializedReader;
        await reader.ensureInitialized();
        return reader.historyPaths;
    };

    it('auto mode reads only the CodeBuddy IDE history in that IDE', async () => {
        const tree = await buildTree(root);

        const paths = await initialize('auto', 'codebuddycn');

        expect(paths).toEqual([tree.ide]);
    });

    it('auto mode reads only VS Code history in VS Code', async () => {
        const tree = await buildTree(root);

        const paths = await initialize('auto', 'vscode');

        expect(paths).toHaveLength(2);
        expect(paths).toEqual(expect.arrayContaining([tree.vscode, tree.encoded]));
        expect(paths).not.toContain(tree.ide);
    });

    it('all mode keeps every channel', async () => {
        await buildTree(root);

        const paths = await initialize('all', 'codebuddycn');

        expect(paths).toHaveLength(3);
    });

    it('retries discovery when history appears after startup', async () => {
        jest.spyOn(PlatformPaths, 'getCodeBuddyDataPaths').mockReturnValue([root]);
        jest.spyOn(ConfigurationManager, 'getSettings').mockReturnValue(normalizeSettings());
        const reader = new CodeBuddyReader() as unknown as InitializedReader;

        await reader.ensureInitialized();
        expect(reader.historyPaths).toHaveLength(0);

        await fs.mkdir(path.join(root, 'Data', 'uid', 'VSCode', 'uid', 'history'), { recursive: true });
        await reader.ensureInitialized();

        expect(reader.historyPaths).toHaveLength(1);
    });
});
