import * as vscode from 'vscode';
import { Logger } from '../utils/logger';
import { normalizeSettings, WaylogSettings } from './waylog-settings';

export enum ConfigKey {
    Enable = 'enable',
    AutoSave = 'autoSave',
    ShowWelcome = 'showWelcome',
    AutoSaveInterval = 'autoSaveInterval',
    CodeBuddyChannel = 'codebuddyChannel',
    CodeBuddyDataPaths = 'codebuddyDataPaths',
    CodeBuddyHistoryDir = 'codebuddyHistoryDir',
    CodeBuddyWorkspacePath = 'codebuddyWorkspacePath',
    OutputDir = 'outputDir',
    FilenameTemplate = 'filenameTemplate'
}

export class ConfigurationManager {
    private static readonly SECTION = 'waylog';
    private disposables: vscode.Disposable[] = [];

    constructor() {
        this.registerListeners();
    }

    public get<T>(key: ConfigKey, defaultValue?: T): T | undefined {
        const config = vscode.workspace.getConfiguration(ConfigurationManager.SECTION);
        const value = config.get<T>(key);
        return value !== undefined ? value : defaultValue;
    }

    public async update(key: ConfigKey, value: any, target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global): Promise<void> {
        const config = vscode.workspace.getConfiguration(ConfigurationManager.SECTION);
        await config.update(key, value, target);
    }

    /** Read every setting through one validated, defaulted entry point. */
    public static getSettings(workspaceConfig?: vscode.WorkspaceConfiguration): WaylogSettings {
        const config = workspaceConfig || vscode.workspace.getConfiguration(ConfigurationManager.SECTION);
        return normalizeSettings({
            enable: config.get(ConfigKey.Enable),
            autoSave: config.get(ConfigKey.AutoSave),
            autoSaveInterval: config.get(ConfigKey.AutoSaveInterval),
            codeBuddyChannel: config.get(ConfigKey.CodeBuddyChannel),
            codeBuddyDataPaths: config.get(ConfigKey.CodeBuddyDataPaths),
            codeBuddyHistoryDir: config.get(ConfigKey.CodeBuddyHistoryDir),
            codeBuddyWorkspacePath: config.get(ConfigKey.CodeBuddyWorkspacePath),
            outputDir: config.get(ConfigKey.OutputDir),
            filenameTemplate: config.get(ConfigKey.FilenameTemplate)
        });
    }

    public get isEnabled(): boolean {
        return ConfigurationManager.getSettings().enable;
    }

    public get isAutoSaveEnabled(): boolean {
        return ConfigurationManager.getSettings().autoSave;
    }

    private registerListeners() {
        this.disposables.push(
            vscode.workspace.onDidChangeConfiguration(e => {
                if (e.affectsConfiguration(ConfigurationManager.SECTION)) {
                    this.onConfigChanged();
                }
            })
        );
    }

    private onConfigChanged() {
        Logger.info('Configuration changed');
        if (this.isEnabled) {
            vscode.window.showInformationMessage('WayLog settings updated');
        }
    }

    public dispose() {
        this.disposables.forEach(d => d.dispose());
    }
}
