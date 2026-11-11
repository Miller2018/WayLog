import * as os from 'os';
import * as path from 'path';
import { PlatformPaths } from '../src/utils/platform-paths';

describe('PlatformPaths.getCodeBuddyDataPaths', () => {
    const originalPlatform = process.platform;
    const originalLocalAppData = process.env.LOCALAPPDATA;
    const originalXdgDataHome = process.env.XDG_DATA_HOME;

    const setPlatform = (value: NodeJS.Platform) => {
        Object.defineProperty(process, 'platform', { value, configurable: true });
    };

    afterEach(() => {
        setPlatform(originalPlatform);
        if (originalLocalAppData === undefined) {
            delete process.env.LOCALAPPDATA;
        } else {
            process.env.LOCALAPPDATA = originalLocalAppData;
        }
        if (originalXdgDataHome === undefined) {
            delete process.env.XDG_DATA_HOME;
        } else {
            process.env.XDG_DATA_HOME = originalXdgDataHome;
        }
    });

    it('includes the XDG data roots and the legacy path on Linux', () => {
        setPlatform('linux');
        delete process.env.XDG_DATA_HOME;
        const home = os.homedir();

        const paths = PlatformPaths.getCodeBuddyDataPaths();

        expect(paths).toContain(path.join(home, '.local', 'share', 'CodeBuddyExtension', 'Data'));
        expect(paths).toContain(path.join(home, '.local', 'share', 'CodeBuddyExtension'));
        expect(paths).toContain(path.join(home, '.codebuddy'));
    });

    it('honors XDG_DATA_HOME on Linux while keeping the default root', () => {
        setPlatform('linux');
        process.env.XDG_DATA_HOME = '/tmp/waylog-xdg';
        const home = os.homedir();

        const paths = PlatformPaths.getCodeBuddyDataPaths();

        expect(paths).toContain(path.join('/tmp/waylog-xdg', 'CodeBuddyExtension', 'Data'));
        expect(paths).toContain(path.join(home, '.local', 'share', 'CodeBuddyExtension', 'Data'));
    });

    it('uses LOCALAPPDATA on Windows and keeps drive-letter roots absolute', () => {
        setPlatform('win32');
        process.env.LOCALAPPDATA = 'C:\\Users\\Test\\AppData\\Local';

        const paths = PlatformPaths.getCodeBuddyDataPaths();

        expect(paths).toContain(path.join(process.env.LOCALAPPDATA, 'CodeBuddyExtension', 'Data'));
        expect(paths.every(candidate => path.win32.isAbsolute(candidate))).toBe(true);
    });

    it('falls back to the home AppData directory when LOCALAPPDATA is missing', () => {
        setPlatform('win32');
        delete process.env.LOCALAPPDATA;
        const home = os.homedir();

        const paths = PlatformPaths.getCodeBuddyDataPaths();

        expect(paths).toContain(path.join(home, 'AppData', 'Local', 'CodeBuddyExtension', 'Data'));
        expect(paths.every(candidate => path.isAbsolute(candidate))).toBe(true);
        expect(paths.every(candidate => !candidate.startsWith('CodeBuddyExtension'))).toBe(true);
    });

    it('keeps the macOS data root', () => {
        setPlatform('darwin');

        const paths = PlatformPaths.getCodeBuddyDataPaths();

        expect(paths).toContain(path.join(os.homedir(), 'Library', 'Application Support', 'CodeBuddyExtension', 'Data'));
    });

    it('does not return duplicate roots', () => {
        setPlatform('linux');
        process.env.XDG_DATA_HOME = path.join(os.homedir(), '.local', 'share');

        const paths = PlatformPaths.getCodeBuddyDataPaths();

        expect(new Set(paths).size).toBe(paths.length);
    });
});
