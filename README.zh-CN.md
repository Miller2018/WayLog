# WayLog - 保存和导出 AI 对话历史

[English](README.md) | [简体中文](README.zh-CN.md)

[![GitHub](https://img.shields.io/badge/GitHub-shayne--snap%2FWayLog-blue?logo=github)](https://github.com/shayne-snap/WayLog)
[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/waylog.waylog)](https://marketplace.visualstudio.com/items?itemName=waylog.waylog)
[![License](https://img.shields.io/github/license/shayne-snap/WayLog)](https://github.com/shayne-snap/WayLog/blob/main/LICENSE)

WayLog 是一个**免费、开源、本地优先的扩展**，它能将你转瞬即逝的 AI 对话转化为永久的、Git 友好的知识库。

不要再因为切换 IDE 或关闭窗口而丢失宝贵的上下文了。WayLog 将来自多个编码助手（Cursor、Copilot、通义灵码等）的知识库统一到一个安全的地方。**永不丢失 AI 对话历史。**

🌟 **[GitHub 开源](https://github.com/shayne-snap/WayLog)** - 社区驱动开发，透明且值得信赖。

> ❗️ **重要提示**：所有对话历史默认保存在工作区的 `.waylog` 文件夹中，可通过 `waylog.outputDir` 修改存放位置。

## ✨ 核心特性

- **🌟 开源项目**：完全透明，采用 Apache-2.0 许可证，社区驱动。[在 GitHub 上贡献](https://github.com/shayne-snap/WayLog)！
- **本地优先架构**：WayLog 在本地运行，直接访问磁盘上的 SQLite 数据库和 JSON 日志。你的数据在你的设备上处理。
- **后台自动保存**：无需手动操作，保持历史记录实时更新。

  ![Auto Save Setting](demo/auto_save_setting.png)
- **统一历史聚合**：自动发现并读取设备上已安装的受支持 AI 扩展的对话历史。
- **选择性保存**：使用 `Save AI Chat History` 命令手动选择要保存的特定对话。

  ![Selective Saving Demo](demo/selective_save.gif)
- **跨平台支持**：兼容 macOS（Intel 和 Apple Silicon）、Windows（x64 和 ARM64）以及 Linux，CodeBuddy 历史目录在各平台自动识别。

## 🔌 支持的 AI 助手

WayLog 开箱即用地支持以下工具：

- **Cursor IDE**（聊天和 Composer / Agent）
- **Claude Code** (VS Code 内)
- **GitHub Copilot**（VS Code 扩展）
- **阿里巴巴通义灵码**（VS Code 扩展）
- **腾讯云代码助手 CodeBuddy**（VS Code 扩展）
- **Roo Code**（VS Code 扩展）
- **Cline**（VS Code 扩展）
- **Kilo**（VS Code 扩展）
- **OpenAI Codex**（VS Code 扩展）
- *...更多即将推出！*

## 📖 使用方法

1.  从 VS Code 市场**安装 WayLog**，然后**重启 VS Code 或 Cursor** 以激活。
2.  **打开工作区**：WayLog 需要一个活动文件夹来保存你的历史记录。
3.  **自动保存**：WayLog 会在后台自动检查新对话。

## ⚙️ 配置项

| 配置项 | 默认值 | 说明 |
| --- | --- | --- |
| `waylog.enable` | `true` | 总开关，关闭后手动命令与自动保存都不执行。 |
| `waylog.autoSave` | `true` | 是否启用后台自动保存。 |
| `waylog.autoSaveInterval` | `60` | 自动保存间隔（秒，10–3600）。 |
| `waylog.codebuddyChannel` | `auto` | 读取哪类 CodeBuddy 历史：`auto`（仅当前 IDE 产品通道）、`VSCode`、`CodeBuddyIDE`、`all`。 |
| `waylog.codebuddyDataPaths` | `[]` | 强制指定 CodeBuddy 数据根目录；为空则按平台自动探测。 |
| `waylog.codebuddyHistoryDir` | `""` | 强制指定某个 `history` 目录（也可直接指定项目目录），跳过自动发现。 |
| `waylog.codebuddyWorkspacePath` | `""` | 覆盖用于定位历史的工作区路径，适用于目录改名、远程开发等场景。 |
| `waylog.outputDir` | `.waylog/history` | 导出目录，相对路径以工作区为基准；支持 `${workspaceFolder}`、`{workspace}`、`{source}`、`{date}`、`{year}`、`{month}`。 |
| `waylog.filenameTemplate` | `{date}_{time}Z-{title}.md` | 文件名模板，占位符：`{date}`、`{time}`、`{title}`、`{source}`、`{workspace}`、`{sessionId}`。 |

CodeBuddy 历史目录会自动识别：Linux 为 `$XDG_DATA_HOME/CodeBuddyExtension/Data` 或 `~/.local/share/CodeBuddyExtension/Data`（兼容旧路径 `~/.codebuddy`），Windows 为 `%LOCALAPPDATA%\CodeBuddyExtension\Data`，macOS 为 `~/Library/Application Support/CodeBuddyExtension/Data`。插件根据当前工作区自动定位对应的会话目录，无需再手工计算哈希、建立软链接。会话名称取自 `index.json` 的真实会话名，导出内容会剔除注入的规则块。

## 🔒 隐私与数据

WayLog 采用严格的**本地优先**策略。它智能地与已安装 AI 扩展的本地存储进行交互，以只读方式检索对话历史。
- 我们**不会**修改或删除你的原始对话记录。
- 所有数据处理完全在你的设备上进行。
- 你的对话历史保存到配置的输出目录（默认 `.waylog/history`），让你完全掌控自己的数据。

## 🤝 贡献

WayLog 是**开源的**，我们欢迎来自全球开发者的贡献！🌍

**代码仓库**：[github.com/shayne-snap/WayLog](https://github.com/shayne-snap/WayLog)

无论你想：
- 🐛 报告 bug 或请求新功能
- 🔌 添加对新 AI 助手的支持
- 📝 改进文档
- 💻 贡献代码改进

请查看我们的[贡献指南](https://github.com/shayne-snap/WayLog/blob/main/CONTRIBUTING.md)开始参与。

**加入我们，一起打造最好的 AI 对话历史工具！** ⭐

## 📄 许可证

本项目采用 **Apache License 2.0** 许可证 - 详见 [LICENSE](LICENSE) 文件。

Copyright (c) 2025 WayLog Contributors

---

**享受零记忆丢失的编码体验。**
