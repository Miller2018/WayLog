export const window = {
    showInformationMessage: jest.fn(),
    showErrorMessage: jest.fn(),
    showWarningMessage: jest.fn(),
    createOutputChannel: jest.fn(() => ({
        appendLine: jest.fn(),
        show: jest.fn(),
        dispose: jest.fn()
    }))
};

export const workspace = {
    getConfiguration: jest.fn(() => ({
        get: jest.fn(),
        update: jest.fn()
    })),
    onDidChangeConfiguration: jest.fn(() => ({ dispose: jest.fn() })),
    workspaceFolders: [],
    rootPath: '/mock/root'
};

export const commands = {
    registerCommand: jest.fn(() => ({ dispose: jest.fn() }))
};

export const env = {
    appName: 'Visual Studio Code',
    uriScheme: 'vscode',
    appRoot: '/mock/app'
};

export const extensions = {
    getExtension: jest.fn()
};

export const ExtensionContext = jest.fn();
export const EventEmitter = jest.fn(() => ({
    event: jest.fn(),
    fire: jest.fn(),
    dispose: jest.fn()
}));

export const ViewColumn = {
    One: 1,
    Two: 2,
    Three: 3
};

export enum ConfigurationTarget {
    Global = 1,
    Workspace = 2,
    WorkspaceFolder = 3
}

export const Uri = {
    file: jest.fn((path: string) => ({
        fsPath: path,
        scheme: 'file'
    })),
    parse: jest.fn((uri: string) => ({
        fsPath: uri,
        scheme: 'file'
    }))
};

export default {
    window,
    workspace,
    commands,
    env,
    extensions,
    ExtensionContext,
    EventEmitter,
    ViewColumn,
    ConfigurationTarget,
    Uri
};
