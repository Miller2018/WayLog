import * as vscode from 'vscode';
import { ConfigKey, ConfigurationManager } from '../src/config/configuration';
import { normalizeSettings } from '../src/config/waylog-settings';
import { saveHistoryCommand } from '../src/commands/save-history';
import { AutoSaveService } from '../src/services/auto-save';

type SyncGate = { shouldRunSync(): boolean };

const shouldRunSync = (service: AutoSaveService): boolean =>
    (service as unknown as SyncGate).shouldRunSync.call(service);

describe('waylog.enable', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('skips the manual save command when disabled', async () => {
        jest.spyOn(ConfigurationManager, 'getSettings')
            .mockReturnValue(normalizeSettings({ [ConfigKey.Enable]: false }));

        await saveHistoryCommand();

        expect(vscode.window.showErrorMessage).not.toHaveBeenCalled();
        expect(vscode.window.showWarningMessage).not.toHaveBeenCalled();
        expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
    });

    it('blocks auto-save when disabled', () => {
        jest.spyOn(ConfigurationManager, 'getSettings')
            .mockReturnValue(normalizeSettings({ [ConfigKey.Enable]: false }));

        expect(shouldRunSync(AutoSaveService.getInstance())).toBe(false);
    });

    it('still respects waylog.autoSave when enabled', () => {
        jest.spyOn(ConfigurationManager, 'getSettings')
            .mockReturnValue(normalizeSettings({ [ConfigKey.Enable]: true, [ConfigKey.AutoSave]: false }));

        expect(shouldRunSync(AutoSaveService.getInstance())).toBe(false);
    });

    it('allows auto-save when both switches are on', () => {
        jest.spyOn(ConfigurationManager, 'getSettings')
            .mockReturnValue(normalizeSettings({ [ConfigKey.Enable]: true, [ConfigKey.AutoSave]: true }));

        expect(shouldRunSync(AutoSaveService.getInstance())).toBe(true);
    });
});
