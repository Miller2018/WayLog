import {
    detectCodeBuddyChannel,
    resolveChannelMode,
    getHistoryPathChannel,
    filterHistoryPathsByChannel
} from '../src/services/readers/codebuddy-channel';

const ideRoots = [
    '/root/.local/share/CodeBuddyExtension/Data/uid-1/CodeBuddyIDE/uid-1/history',
    '/root/.local/share/CodeBuddyExtension/Data/uid-1/VSCode/uid-1/history',
    'C:\\Users\\Test\\AppData\\Local\\CodeBuddyExtension\\Data\\uid-1\\VSCode\\uid-1\\history'
];

describe('detectCodeBuddyChannel', () => {
    it('detects CodeBuddy IDE from its product name and URI scheme', () => {
        expect(detectCodeBuddyChannel({ appName: 'CodeBuddy CN', uriScheme: 'codebuddycn' })).toBe('CodeBuddyIDE');
    });

    it('detects VS Code from its product name and URI scheme', () => {
        expect(detectCodeBuddyChannel({ appName: 'Visual Studio Code', uriScheme: 'vscode' })).toBe('VSCode');
    });

    it('uses the extension host installation path when product names are unknown', () => {
        expect(detectCodeBuddyChannel({ appName: 'Unknown', appRoot: '/root/.codebuddy-server-cn/bin/stable' })).toBe('CodeBuddyIDE');
        expect(detectCodeBuddyChannel({ appName: 'Unknown', appRoot: '/root/.vscode-server/bin/stable' })).toBe('VSCode');
    });

    it('returns undefined for an unrelated IDE', () => {
        expect(detectCodeBuddyChannel({ appName: 'Trae CN', uriScheme: 'trae-cn', appRoot: '/root/.trae-cn-server/bin' })).toBeUndefined();
    });
});

describe('resolveChannelMode', () => {
    it('uses the current product channel in auto mode', () => {
        expect(resolveChannelMode('auto', { uriScheme: 'codebuddycn' })).toBe('CodeBuddyIDE');
        expect(resolveChannelMode('auto', { uriScheme: 'vscode' })).toBe('VSCode');
    });

    it('falls back to VS Code for an unrecognized host', () => {
        expect(resolveChannelMode('auto', { appName: 'Trae CN' })).toBe('VSCode');
    });

    it('honors explicit channel and all overrides', () => {
        expect(resolveChannelMode('CodeBuddyIDE', { uriScheme: 'vscode' })).toBe('CodeBuddyIDE');
        expect(resolveChannelMode('all', { uriScheme: 'codebuddycn' })).toBe('all');
    });
});

describe('getHistoryPathChannel', () => {
    it('recognizes both Linux and Windows history paths', () => {
        expect(getHistoryPathChannel(ideRoots[0])).toBe('CodeBuddyIDE');
        expect(getHistoryPathChannel(ideRoots[1])).toBe('VSCode');
        expect(getHistoryPathChannel(ideRoots[2])).toBe('VSCode');
    });

    it('returns undefined for legacy paths without a product segment', () => {
        expect(getHistoryPathChannel('/root/.codebuddy/history')).toBeUndefined();
    });
});

describe('filterHistoryPathsByChannel', () => {
    it('keeps only the current IDE channel in auto mode', () => {
        const idePaths = filterHistoryPathsByChannel(ideRoots, 'auto', { uriScheme: 'codebuddycn' });
        expect(idePaths).toEqual([ideRoots[0]]);

        const vscodePaths = filterHistoryPathsByChannel(ideRoots, 'auto', { uriScheme: 'vscode' });
        expect(vscodePaths).toEqual([ideRoots[1], ideRoots[2]]);
    });

    it('keeps legacy paths without a recognizable channel', () => {
        const paths = [...ideRoots, '/root/.codebuddy/history'];
        const filtered = filterHistoryPathsByChannel(paths, 'auto', { uriScheme: 'vscode' });
        expect(filtered).toContain('/root/.codebuddy/history');
        expect(filtered).not.toContain(ideRoots[0]);
    });

    it('returns every root in all mode', () => {
        expect(filterHistoryPathsByChannel(ideRoots, 'all', { uriScheme: 'codebuddycn' })).toEqual(ideRoots);
    });
});
