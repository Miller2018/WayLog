import * as fsSync from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ConfigKey, ConfigurationManager } from '../src/config/configuration';
import { DEFAULT_OUTPUT_DIR, normalizeSettings } from '../src/config/waylog-settings';
import { resolveOutputDir, sanitizePathSegment } from '../src/services/export-paths';
import { AutoSaveService } from '../src/services/auto-save';

const workspaceRoot = path.join('/home', 'yuhao', 'project');
const fixedDate = new Date('2026-01-10T11:04:56.000Z');

type HistoryDirPreparer = { prepareHistoryDirectory(root: string): Promise<string | undefined> };

describe('resolveOutputDir', () => {
    it('keeps the default .waylog/history layout', () => {
        expect(resolveOutputDir(DEFAULT_OUTPUT_DIR, { workspaceRoot }))
            .toBe(path.join(workspaceRoot, '.waylog', 'history'));
        expect(resolveOutputDir('   ', { workspaceRoot }))
            .toBe(path.join(workspaceRoot, '.waylog', 'history'));
    });

    it('resolves relative directories against the workspace', () => {
        expect(resolveOutputDir('archive/chats', { workspaceRoot }))
            .toBe(path.join(workspaceRoot, 'archive', 'chats'));
    });

    it('keeps absolute POSIX and Windows paths', () => {
        expect(resolveOutputDir('/tmp/waylog', { workspaceRoot })).toBe('/tmp/waylog');
        expect(resolveOutputDir('C:\\exports\\history', { workspaceRoot: 'C:\\repo' }))
            .toBe('C:\\exports\\history');
    });

    it('expands workspaceFolder and classification placeholders', () => {
        expect(resolveOutputDir('${workspaceFolder}/docs/{date}', { workspaceRoot, date: fixedDate }))
            .toBe(path.join(workspaceRoot, 'docs', '2026-01-10'));
        expect(resolveOutputDir('archive/{source}/{year}/{month}/{workspace}', {
            workspaceRoot,
            source: 'Tencent CodeBuddy',
            date: fixedDate
        })).toBe(path.join(workspaceRoot, 'archive', 'Tencent_CodeBuddy', '2026', '01', 'project'));
    });

    it('expands the home directory', () => {
        expect(resolveOutputDir('~/waylog', { workspaceRoot })).toBe(path.join(os.homedir(), 'waylog'));
    });

    it('sanitizes unsafe path segments', () => {
        expect(sanitizePathSegment('a/b:c')).toBe('a_b_c');
        expect(sanitizePathSegment('  ')).toBe('unknown');
    });
});

describe('auto-save output directory', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('creates the configured directory instead of the hardcoded one', async () => {
        const root = fsSync.mkdtempSync(path.join(os.tmpdir(), 'waylog-export-'));
        jest.spyOn(ConfigurationManager, 'getSettings').mockReturnValue(normalizeSettings({
            [ConfigKey.OutputDir]: 'archive/{source}',
            [ConfigKey.AutoSave]: false
        }));
        const service = AutoSaveService.getInstance() as unknown as HistoryDirPreparer;

        try {
            const historyDir = await service.prepareHistoryDirectory(root);

            expect(historyDir).toBe(path.join(root, 'archive', 'unknown'));
            expect(fsSync.existsSync(historyDir as string)).toBe(true);
        } finally {
            fsSync.rmSync(root, { recursive: true, force: true });
        }
    });
});
