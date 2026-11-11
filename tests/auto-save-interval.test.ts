import { ConfigKey, ConfigurationManager } from '../src/config/configuration';
import { normalizeSettings } from '../src/config/waylog-settings';
import { AutoSaveService } from '../src/services/auto-save';

describe('auto-save interval setting', () => {
    let service: AutoSaveService;

    beforeEach(() => {
        jest.useFakeTimers();
        service = AutoSaveService.getInstance();
    });

    afterEach(() => {
        service.stop();
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    it('uses the configured interval', () => {
        jest.spyOn(ConfigurationManager, 'getSettings').mockReturnValue(normalizeSettings({
            [ConfigKey.AutoSave]: false,
            [ConfigKey.AutoSaveInterval]: 120
        }));
        const setIntervalSpy = jest.spyOn(global, 'setInterval');

        service.start();

        expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 120000);
    });

    it('uses the 60 second default when the interval is not configured', () => {
        jest.spyOn(ConfigurationManager, 'getSettings').mockReturnValue(normalizeSettings({
            [ConfigKey.AutoSave]: false
        }));
        const setIntervalSpy = jest.spyOn(global, 'setInterval');

        service.start();

        expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 60000);
    });
});
