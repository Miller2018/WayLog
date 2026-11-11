# WayLog - Save & Export AI Chat History

[English](README.md) | [简体中文](README.zh-CN.md)

[![GitHub](https://img.shields.io/badge/GitHub-shayne--snap%2FWayLog-blue?logo=github)](https://github.com/shayne-snap/WayLog)
[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/waylog.waylog)](https://marketplace.visualstudio.com/items?itemName=waylog.waylog)
[![License](https://img.shields.io/github/license/shayne-snap/WayLog)](https://github.com/shayne-snap/WayLog/blob/main/LICENSE)

WayLog is a **free, open-source, local-first extension** that turns your fleeting AI conversations into a permanent, git-friendly knowledge base.


Stop losing valuable context when you switch IDEs or close a window. WayLog unifies your knowledge base from multiple coding assistants—Cursor, Copilot, Lingma, and more—in one secure place. **Never lose AI chat history.**

🌟 **[Open Source on GitHub](https://github.com/shayne-snap/WayLog)** - Community-driven development, transparent and trustworthy.

> ❗️ **Important Note**: All chat history is saved locally in the `.waylog` folder within your workspace by default. Use `waylog.outputDir` to choose another location.
>
## ✨ Key Features

- **🌟 Open Source**: Fully transparent, Apache-2.0-licensed, and community-driven. [Contribute on GitHub](https://github.com/shayne-snap/WayLog)!
- **Local-First Architecture**: WayLog runs locally, directly accessing the SQLite databases and JSON logs on your disk. Your data is processed on your devices.
- **Background Auto-Save**: Keep your history up-to-date without manual intervention.

  ![Auto Save Setting](demo/auto_save_setting.png)
- **Unified History Aggregation**: Automatically discovers and reads chat history from supported AI extensions installed on your devices.
- **Selective Saving**: Manually select specific conversations to save using the `Save AI Chat History` command.

  ![Selective Saving Demo](demo/selective_save.gif)
- **Cross-Platform Support**: macOS (Intel & Apple Silicon), Windows (x64 & ARM64) and Linux. CodeBuddy history is auto-discovered on each platform.

## 🔌 Supported AI Assistants

WayLog connects with the following tools out of the box:

- **Cursor IDE** (Chat & Composer / Agent)
- **Claude Code** (VS Code InSide)
- **GitHub Copilot** (VS Code Extension)
- **Alibaba Lingma** (通义灵码 - VS Code Extension)
- **Tencent Cloud CodeBuddy** (腾讯云代码助手 - VS Code Extension)
- **Roo Code** (VS Code Extension)
- **Cline** (VS Code Extension)
- **Kilo** (VS Code Extension)
- **OpenAI Codex** (VS Code Extension)
- *...and more coming soon!*

## 📖 How to Use

1.  **Install WayLog** from the VS Code Marketplace, then **Restart VS Code or Cursor** to activate.
2.  **Open a Workspace**: WayLog requires an active folder to save your history.

3.  **Auto-Save**: WayLog automatically checks for new conversations in the background.

## ⚙️ Settings

| Setting | Default | Description |
| --- | --- | --- |
| `waylog.enable` | `true` | Master switch for all WayLog features. |
| `waylog.autoSave` | `true` | Enable background auto-save. |
| `waylog.autoSaveInterval` | `60` | Seconds between auto-save runs (10–3600). |
| `waylog.codebuddyChannel` | `auto` | CodeBuddy history to read: `auto` (only the current IDE product channel), `VSCode`, `CodeBuddyIDE`, or `all`. |
| `waylog.codebuddyDataPaths` | `[]` | Override the CodeBuddy data roots. Empty uses the platform defaults. |
| `waylog.codebuddyHistoryDir` | `""` | Force one CodeBuddy `history` directory (or one project directory) and skip discovery. |
| `waylog.codebuddyWorkspacePath` | `""` | Override the workspace path used to locate CodeBuddy history, e.g. after renaming a folder. |
| `waylog.outputDir` | `.waylog/history` | Export directory. Relative paths are workspace-relative; supports `${workspaceFolder}`, `{workspace}`, `{source}`, `{date}`, `{year}`, `{month}`. |
| `waylog.filenameTemplate` | `{date}_{time}Z-{title}.md` | Filename template. Placeholders: `{date}`, `{time}`, `{title}`, `{source}`, `{workspace}`, `{sessionId}`. |

CodeBuddy history is discovered automatically on Linux (`$XDG_DATA_HOME/CodeBuddyExtension/Data` or `~/.local/share/CodeBuddyExtension/Data`, plus the legacy `~/.codebuddy`), Windows (`%LOCALAPPDATA%\CodeBuddyExtension\Data`) and macOS. The current workspace selects the correct history folder, so manual hashes and symlinks are no longer needed. Session names come from CodeBuddy's own `index.json`, and injected rule blocks are removed from exports.

## 🔒 Privacy & Data

WayLog operates with a strict **local-first** policy. It intelligently interfaces with the local storage of your installed AI extensions to retrieve chat history in a read-only manner.
- We **do not** modify or delete your original chat records.
- All data processing happens entirely on your devices.
- Your chat history is saved to the configured output directory (`.waylog/history` by default), giving you full control over your data.

## 🤝 Contributing

WayLog is **open source** and we welcome contributions from developers worldwide! 🌍

**Repository**: [github.com/shayne-snap/WayLog](https://github.com/shayne-snap/WayLog)

Whether you want to:
- 🐛 Report a bug or request a feature
- 🔌 Add support for a new AI assistant
- 📝 Improve documentation
- 💻 Contribute code improvements

Please check out our [Contributing Guide](https://github.com/shayne-snap/WayLog/blob/main/CONTRIBUTING.md) to get started.

**Join us in building the best AI chat history tool!** ⭐

## 📄 License

This project is licensed under the **Apache License 2.0** - see the [LICENSE](LICENSE) file for details.

Copyright (c) 2025 WayLog Contributors

---

**Enjoy coding with zero memory loss.**
