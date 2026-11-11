import * as vscode from 'vscode';
import { activate } from '../src/extension';
import { AutoSaveService } from '../src/services/auto-save';

type ConfigListener = (event: { affectsConfiguration(section: string): boolean }) => void;

describe('auto-save settings changes', () => {
    let service: AutoSaveService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = AutoSaveService.getInstance();
    });

    afterEach(() => {
        jest.restoreAllMocks();
        service.stop();
    });

    it('restarts auto-save when settings change while enabled', () => {
        const restart = jest.spyOn(service, 'restart').mockImplementation(() => undefined);
        const stop = jest.spyOn(service, 'stop').mockImplementation(() => undefined);

        service.applySettings(true);

        expect(restart).toHaveBeenCalledTimes(1);
        expect(stop).not.toHaveBeenCalled();
    });

    it('stops auto-save when the switches are turned off', () => {
        const restart = jest.spyOn(service, 'restart').mockImplementation(() => undefined);
        const stop = jest.spyOn(service, 'stop').mockImplementation(() => undefined);

        service.applySettings(false);

        expect(stop).toHaveBeenCalledTimes(1);
        expect(restart).not.toHaveBeenCalled();
    });

    it('restart stops the previous timer before starting a new one', () => {
        const stop = jest.spyOn(service, 'stop').mockImplementation(() => undefined);
        const start = jest.spyOn(service, 'start').mockImplementation(() => undefined);

        service.restart();

        expect(stop.mock.invocationCallOrder[0]).toBeLessThan(start.mock.invocationCallOrder[0]);
    });

    it('registers a configuration listener that applies the new settings', async () => {
        const listeners: ConfigListener[] = [];
        (vscode.workspace.onDidChangeConfiguration as jest.Mock).mockImplementation((callback: ConfigListener) => {
            listeners.push(callback);
            return { dispose: jest.fn() };
        });
        jest.spyOn(AutoSaveService.prototype, 'start').mockImplementation(() => undefined);
        const applySettings = jest.spyOn(AutoSaveService.prototype, 'applySettings').mockImplementation(() => undefined);

        const context = {
            subscriptions: [],
            globalState: { get: jest.fn(() => false), update: jest.fn() }
        } as unknown as vscode.ExtensionContext;

        await activate(context);

        const listener = listeners[listeners.length - 1];
        expect(listener).toBeDefined();

        listener({ affectsConfiguration: () => false });
        expect(applySettings).not.toHaveBeenCalled();

        listener({ affectsConfiguration: () => true });
        expect(applySettings).toHaveBeenCalledWith(true);
    });
});
