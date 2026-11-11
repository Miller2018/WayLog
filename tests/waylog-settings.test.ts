import * as vscode from 'vscode';
import { ConfigKey, ConfigurationManager } from '../src/config/configuration';
import {
    normalizeSettings,
    DEFAULT_AUTO_SAVE_INTERVAL_SECONDS,
    DEFAULT_FILENAME_TEMPLATE,
    DEFAULT_OUTPUT_DIR
} from '../src/config/waylog-settings';

describe('normalizeSettings', () => {
    it('provides all defaults when configuration is empty', () => {
        expect(normalizeSettings({})).toEqual({
            enable: true,
            autoSave: true,
            autoSaveIntervalSeconds: DEFAULT_AUTO_SAVE_INTERVAL_SECONDS,
            codeBuddyChannel: 'auto',
            codeBuddyDataPaths: [],
            codeBuddyHistoryDir: '',
            codeBuddyWorkspacePath: '',
            outputDir: DEFAULT_OUTPUT_DIR,
            filenameTemplate: DEFAULT_FILENAME_TEMPLATE
        });
    });

    it('keeps explicit overrides and trims text values', () => {
        const settings = normalizeSettings({
            enable: false,
            autoSave: false,
            autoSaveInterval: 120,
            codeBuddyChannel: 'all',
            codeBuddyDataPaths: ['  /custom/root  ', '', 42],
            codeBuddyHistoryDir: '  /custom/history  ',
            codeBuddyWorkspacePath: ' /custom/workspace ',
            outputDir: '  archive/{source}  ',
            filenameTemplate: ' {title}.md '
        });

        expect(settings).toEqual({
            enable: false,
            autoSave: false,
            autoSaveIntervalSeconds: 120,
            codeBuddyChannel: 'all',
            codeBuddyDataPaths: ['/custom/root'],
            codeBuddyHistoryDir: '/custom/history',
            codeBuddyWorkspacePath: '/custom/workspace',
            outputDir: 'archive/{source}',
            filenameTemplate: '{title}.md'
        });
    });

    it('rejects invalid channel, interval and path values', () => {
        const settings = normalizeSettings({
            codeBuddyChannel: 'unknown',
            autoSaveInterval: 0,
            codeBuddyDataPaths: 'not-an-array',
            outputDir: '   ',
            filenameTemplate: ''
        });

        expect(settings.codeBuddyChannel).toBe('auto');
        expect(settings.autoSaveIntervalSeconds).toBe(60);
        expect(settings.codeBuddyDataPaths).toEqual([]);
        expect(settings.outputDir).toBe(DEFAULT_OUTPUT_DIR);
        expect(settings.filenameTemplate).toBe(DEFAULT_FILENAME_TEMPLATE);
    });
});

describe('ConfigurationManager.getSettings', () => {
    it('reads every setting from the waylog configuration section', () => {
        const values: Record<string, unknown> = {
            [ConfigKey.Enable]: false,
            [ConfigKey.AutoSave]: false,
            [ConfigKey.AutoSaveInterval]: 300,
            [ConfigKey.CodeBuddyChannel]: 'CodeBuddyIDE',
            [ConfigKey.CodeBuddyDataPaths]: ['/extra/root'],
            [ConfigKey.CodeBuddyHistoryDir]: '/forced/history',
            [ConfigKey.CodeBuddyWorkspacePath]: '/forced/workspace',
            [ConfigKey.OutputDir]: '/tmp/exports',
            [ConfigKey.FilenameTemplate]: '{title}-{source}.md'
        };
        const workspaceConfig = {
            get: (key: string) => values[key]
        } as unknown as vscode.WorkspaceConfiguration;

        const settings = ConfigurationManager.getSettings(workspaceConfig);

        expect(settings.codeBuddyChannel).toBe('CodeBuddyIDE');
        expect(settings.codeBuddyHistoryDir).toBe('/forced/history');
        expect(settings.codeBuddyWorkspacePath).toBe('/forced/workspace');
        expect(settings.codeBuddyDataPaths).toEqual(['/extra/root']);
        expect(settings.outputDir).toBe('/tmp/exports');
        expect(settings.filenameTemplate).toBe('{title}-{source}.md');
        expect(settings.autoSaveIntervalSeconds).toBe(300);
        expect(settings.enable).toBe(false);
        expect(settings.autoSave).toBe(false);
    });
});
