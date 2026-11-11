import * as vscode from 'vscode';
import { registerCommands } from './commands';
import { ConfigurationManager } from './config/configuration';
import { WayLogService } from './services/way-log-service';
import { AutoSaveService } from './services/auto-save';
import { Logger } from './utils/logger';

let configManager: ConfigurationManager;
let waylogService: WayLogService;
let autoSaveService: AutoSaveService;

export async function activate(context: vscode.ExtensionContext) {

    Logger.info('Activating WayLog extension...');

    // Initialize Configuration Manager
    configManager = new ConfigurationManager();
    context.subscriptions.push(configManager);

    // Initialize Services
    waylogService = WayLogService.getInstance(configManager);
    await waylogService.initialize();

    // Start Auto-Save Service only when the extension is enabled
    autoSaveService = AutoSaveService.getInstance(context);
    if (ConfigurationManager.getSettings().enable) {
        autoSaveService.start();
    }

    // Register Commands
    registerCommands(context);

    // React to setting changes without requiring a window reload
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(event => {
            if (!event.affectsConfiguration('waylog')) {
                return;
            }
            const settings = ConfigurationManager.getSettings();
            autoSaveService.applySettings(settings.enable && settings.autoSave);
        })
    );

    // Check Welcome Message
    checkWelcomeMessage(context);

    Logger.info('WayLog extension activated successfully!');
}

function checkWelcomeMessage(context: vscode.ExtensionContext) {
    const showWelcome = context.globalState.get('waylog.showWelcome', true);
    if (showWelcome) {
        vscode.window.showInformationMessage('WayLog extension is now active! Use the command palette to get started.');
        context.globalState.update('waylog.showWelcome', false);
    }
}

export function deactivate() {
    Logger.info('Deactivating WayLog extension...');

    if (autoSaveService) {
        autoSaveService.stop();
    }

    if (waylogService) {
        waylogService.dispose();
    }
}
