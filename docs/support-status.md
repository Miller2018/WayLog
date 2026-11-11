# AI IDE/Extension Support Status

This document tracks the support status of various AI coding assistants and their data export/import capabilities for WayLog.

## Overview

| Provider | Version | Support Level | Data Format | Integrity | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **GitHub Copilot** | VS Code Extension | ✅ Full | JSON | 100% | Native VS Code chat storage. |
| **Claude Code** | VS Code Extension | ✅ Full | JSON | 100% | Native storage, aggressive content filtering. |
| **Cursor** | Cursor IDE | ✅ Full | SQLite + JSON | 100% | Extracted from `state.vscdb`. |
| **Cline Family** | Cline/Roo/Kilo | ✅ Full | JSON | 100% | Task-based storage, full thinking logs. |
| **OpenAI Codex** | CLI Tool | ✅ Full | JSONL | 100% | Parsed from hourly/event-based logs. |
| **Tencent CodeBuddy**| Extension & IDE | ✅ Full | JSON | 100% | Plaintext files, includes full context. |
| **Alibaba Lingma** | VS Code Extension | ⚠️ Partial | SQLite | 60-70% | Main content encrypted; readable via summaries. |
| **Gemini Code Assist** | VS Code Extension | 🏗 Planned | JSON (SQLite) | 100% | Stored in VS Code's global state database. |
| **Continue** | VS Code Extension | 🏗 Planned | JSON | 100% | Stored in `~/.continue/sessions/`. |
| **Windsurf** | Windsurf IDE | ❌ None | Protobuf | 0% | Encrypted Protocol Buffers. |
| **Trae / MarsCode** | IDE & Extension | ❌ None | Proprietary | 0% | Proprietary binary/encrypted format. |

---

## Detailed Support Analysis

### 1. GitHub Copilot & Claude Code (VS Code Native)
*   **Status**: **Fully Supported**
*   **Mechanism**: Scans VS Code's native `workspaceStorage` and parses `chatSessions/*.json`.
*   **Special Filtering**:
    *   **Copilot**: Standard native import.
    *   **Claude**: Uses aggressive content detection (searching for "claude", "@claude", etc.) to identify Claude sessions even when proxied through other tools.
*   **Storage Path**: `~/Library/Application Support/Code - Insiders/User/workspaceStorage/`

### 2. Cline Family (Cline, Roo Code, Kilo Code)
*   **Status**: **Highest Fidelity**
*   **Mechanism**: Directly reads task-based JSON folders in `globalStorage`.
*   **Key Features**:
    *   Captures full **Thinking/Reasoning** blocks.
    *   Preserves cost and token usage metadata.
    *   Automatically groups tasks by project using environment log detection.
*   **Storage Path**: `~/Library/Application Support/Code - Insiders/User/globalStorage/saoudrizwan.claude-dev/` (and relatives)

### 3. OpenAI Codex (CLI)
*   **Status**: **Fully Supported**
*   **Mechanism**: Parses `~/.codex/sessions/**/*.jsonl` event logs.
*   **Data Integrity**: **High**. We filter out the massive `system` and `environment` boilerplate to extract clean dialogues.
*   **Note**: The VS Code Extension version of Codex acts as a bridge to the macOS App and does not store history locally in the extension folder.

### 4. Cursor IDE
*   **Status**: **Fully Supported**
*   **Mechanism**: Cross-database join between Workspace and Global SQLite storage.
*   **Data Structure**:
    *   **Legacy Data**: Extracts from `workbench.panel.aichat.view.aichat.chatdata` in workspace `state.vscdb`.
    *   **New Data (Agent/Composer)**: Fetches session IDs from `composer.composerData` in workspace `state.vscdb` and aggregates individual message bubbles from the `cursorDiskKV` table in the **Global** `state.vscdb`.
    *   **Modes**: Supports Chat, Agent, Plan, Debug, and Ask modes.

### 5. Tencent Cloud CodeBuddy (腾讯云 AI 代码助手)
*   **Status**: **Supported** (VS Code extension and CodeBuddy IDE)
*   **Mechanism**: Directly reads local JSON history files. History roots are discovered under the platform data directory and matched to the current workspace. `waylog.codebuddyChannel` selects only the current IDE product channel by default, or all channels.
*   **Data Integrity**: Includes full context and responses; session titles come from `index.json` conversation names and injected rule blocks are removed.
*   **Storage Paths**:
    *   macOS: `~/Library/Application Support/CodeBuddyExtension/Data/`
    *   Linux: `$XDG_DATA_HOME/CodeBuddyExtension/Data/` or `~/.local/share/CodeBuddyExtension/Data/` (legacy `~/.codebuddy` is still probed)
    *   Windows: `%LOCALAPPDATA%\CodeBuddyExtension\Data\`
*   **Overrides**: `waylog.codebuddyDataPaths`, `waylog.codebuddyHistoryDir`, `waylog.codebuddyWorkspacePath`

### 6. Alibaba Cloud Lingma (通义灵码)
*   **Status**: **Partial Support (Summary Only)**
*   **Mechanism**: Reads the local SQLite database.
*   **Note**: The `question` and `answer` fields are encrypted. We import the `summary` fields which are in plaintext.
*   **Storage Path**: `~/.lingma/vscode/sharedClientCache/cache/db/local.db`

### 7. Google Gemini Code Assist
*   **Status**: **Planned**
*   **Mechanism**: Reads VS Code's global state database (`state.vscdb`) and extracts the `google.geminicodeassist` key.
*   **Data Structure**:
    *   Chat history is stored as a JSON object in the `ItemTable` of the global `state.vscdb`.
    *   Each conversation contains full message history including user queries, thought processes, and markdown responses.
    *   Includes IDE context (current file, workspace info) for each interaction.
*   **Data Integrity**: **100%** - Full plaintext access to all conversation data.
*   **Storage Path**:
    *   VS Code: `~/Library/Application Support/Code/User/globalStorage/state.vscdb`
    *   VS Code Insiders: `~/Library/Application Support/Code - Insiders/User/globalStorage/state.vscdb`
*   **Implementation Notes**:
    *   Extension ID: `google.geminicodeassist`
    *   Data is stored in a single SQLite key rather than separate files.
    *   Supports extraction of thinking/reasoning blocks similar to Cline family.

---

## References & Research

WayLog's implementation is informed by community research and original discovery:

*   **OpenAI Codex Research**:
    *   [Issue #2880: Copy/Export Message as Markdown](https://github.com/openai/codex/issues/2880) - Insight into Codex's `~/.codex/sessions` JSONL format.
    *   [andylizf/codexer](https://github.com/andylizf/codexer) - A terminal UI for browsing Codex/Claude transcripts.
*   **Alibaba Lingma & VS Code Native**:
    *   **Original Research**: WayLog performed custom reverse-engineering via `find` and `sqlite3` to uncover the encryption-vs-plaintext layout in `~/.lingma/vscode/sharedClientCache/cache/db/local.db`.
    *   **Internal Store**: Direct mapping of the `state.vscdb` and `chatSessions/` hierarchy through local traversal and indexing research.
*   **Cline/Roo/Kilo Family**:
    *   Shared architectural findings from the open-source roots of Cline/Roo-Cline and task-based metadata inspection.
*   **Cursor IDE Research**:
    *   [somogyijanos/cursor-chat-export](https://github.com/somogyijanos/cursor-chat-export) - Research on extracting Cursor chat history from SQLite.
*   **Dynamic Interception (Hooking) Research**:
    *   [ljw1004/antigravity-trace](https://github.com/ljw1004/antigravity-trace) - Proof-of-concept for intercepting internal IDE messages to capture chat history from encrypted tools like Antigravity.
