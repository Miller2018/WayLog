import * as os from 'os';
import * as path from 'path';

/**
 * Utility to get platform-specific application data paths.
 * Handles the differences between macOS (Darwin), Windows (win32), and Linux.
 */
export class PlatformPaths {
    /**
     * Get the base directory for application support/data.
     * - macOS: ~/Library/Application Support
     * - Windows: %APPDATA%
     * - Linux: ~/.config
     */
    static getAppDataPath(): string {
        switch (process.platform) {
            case 'darwin':
                return path.join(os.homedir(), 'Library', 'Application Support');
            case 'win32':
                return process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
            case 'linux':
                return process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
            default:
                // Fallback to home dir for unknown platforms
                return os.homedir();
        }
    }

    /**
     * Get Cursor IDE storage base path
     */
    static getCursorStoragePath(): string {
        const base = this.getAppDataPath();
        return path.join(base, 'Cursor', 'User', 'workspaceStorage');
    }

    /**
     * Get Cursor IDE global storage path
     */
    static getCursorGlobalStoragePath(): string {
        const base = this.getAppDataPath();
        return path.join(base, 'Cursor', 'User', 'globalStorage', 'state.vscdb');
    }

    /**
     * Get CodeBuddy data path
     */
    static getCodeBuddyDataPath(): string {
        if (process.platform === 'darwin') {
            return path.join(os.homedir(), 'Library', 'Application Support', 'CodeBuddyExtension', 'Data');
        } else if (process.platform === 'win32') {
            // Windows: Use LOCALAPPDATA (not APPDATA/Roaming)
            // Actual path: C:\Users\{username}\AppData\Local\CodeBuddyExtension
            return path.join(process.env.LOCALAPPDATA || '', 'CodeBuddyExtension');
        } else {
            return path.join(os.homedir(), '.codebuddy');
        }
    }

    /**
     * Get all plausible CodeBuddy data roots for the current platform.
     * The IDE has used both <root>/Data/... and <root>/... layouts, and Linux
     * installations may follow XDG_DATA_HOME, so callers should probe every root.
     */
    static getCodeBuddyDataPaths(): string[] {
        const home = os.homedir();
        const candidates: string[] = [];
        const add = (...segments: string[]) => {
            const value = path.join(...segments);
            if (!candidates.includes(value)) {
                candidates.push(value);
            }
        };

        if (process.platform === 'darwin') {
            const base = path.join(home, 'Library', 'Application Support', 'CodeBuddyExtension');
            add(base, 'Data');
            add(base);
        } else if (process.platform === 'win32') {
            const localRoots = [process.env.LOCALAPPDATA, path.join(home, 'AppData', 'Local')]
                .filter((value): value is string => Boolean(value));
            for (const localRoot of localRoots) {
                const base = path.join(localRoot, 'CodeBuddyExtension');
                add(base, 'Data');
                add(base);
            }
        } else if (process.platform === 'linux') {
            const dataRoots = [process.env.XDG_DATA_HOME, path.join(home, '.local', 'share')]
                .filter((value): value is string => Boolean(value));
            for (const dataRoot of dataRoots) {
                const base = path.join(dataRoot, 'CodeBuddyExtension');
                add(base, 'Data');
                add(base);
            }
            // Legacy location, still used by older installs and by existing symlinks.
            add(home, '.codebuddy');
        } else {
            add(home, '.codebuddy');
        }

        return candidates;
    }

    /**
     * Get all possible VS Code workspace storage directories (both Stable and Insiders)
     * Returns an array of paths to check
     */
    static getVSCodeWorkspaceStoragePaths(): string[] {
        const base = this.getAppDataPath();
        return [
            path.join(base, 'Code', 'User', 'workspaceStorage'),           // Stable
            path.join(base, 'Code - Insiders', 'User', 'workspaceStorage') // Insiders
        ];
    }

    /**
     * Get all possible VS Code global storage directories (both Stable and Insiders)
     * Returns an array of paths to check
     */
    static getVSCodeGlobalStoragePaths(): string[] {
        const base = this.getAppDataPath();
        return [
            path.join(base, 'Code', 'User', 'globalStorage'),           // Stable
            path.join(base, 'Code - Insiders', 'User', 'globalStorage') // Insiders
        ];
    }

    /**
     * Get VS Code Global Storage path (for Cline/Roo Code etc)
     * @deprecated Use getVSCodeGlobalStoragePaths() instead to support both Stable and Insiders
     */
    static getVSCodeGlobalStoragePath(): string {
        const base = this.getAppDataPath();
        // Return base path, caller usually appends 'Code/User/globalStorage' or similar
        return base;
    }

    /**
     * Get Claude Code storage base path (~/.claude)
     */
    static getClaudeStoragePath(): string {
        return path.join(os.homedir(), '.claude');
    }

    /**
     * Get Claude Code projects path (~/.claude/projects)
     */
    static getClaudeProjectsPath(): string {
        return path.join(this.getClaudeStoragePath(), 'projects');
    }
}
