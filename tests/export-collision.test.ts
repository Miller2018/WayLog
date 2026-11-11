import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { resolveExportFile } from '../src/services/waylog-index';
import { formatSessionMarkdown } from '../src/services/session-utils';
import { ChatSession } from '../src/services/readers/types';

const baseTimestamp = new Date('2026-01-10T11:04:56.123Z').getTime();

function makeSession(id: string): ChatSession {
    return {
        id,
        title: '同名会话',
        description: '',
        timestamp: baseTimestamp,
        source: 'Tencent CodeBuddy',
        messages: [{ role: 'user', content: 'hello' }]
    };
}

describe('resolveExportFile', () => {
    let historyDir: string;

    beforeEach(async () => {
        historyDir = await fs.mkdtemp(path.join(os.tmpdir(), 'waylog-collision-'));
    });

    afterEach(async () => {
        await fs.rm(historyDir, { recursive: true, force: true });
    });

    it('gives a second session with the same name its own file', async () => {
        const first = makeSession('session-a');
        const firstFile = await resolveExportFile(first, historyDir);
        expect(firstFile.exists).toBe(false);
        await fs.writeFile(firstFile.filepath, formatSessionMarkdown(first), 'utf8');

        const second = makeSession('session-b');
        const secondFile = await resolveExportFile(second, historyDir);

        expect(secondFile.exists).toBe(false);
        expect(secondFile.filepath).not.toBe(firstFile.filepath);
        expect(path.basename(secondFile.filepath)).toMatch(/-[a-f0-9]{8}\.md$/);

        await fs.writeFile(secondFile.filepath, formatSessionMarkdown(second), 'utf8');

        expect(await resolveExportFile(first, historyDir)).toEqual({ filepath: firstFile.filepath, exists: true });
        expect(await resolveExportFile(second, historyDir)).toEqual({ filepath: secondFile.filepath, exists: true });
    });

    it('keeps legacy exports without a session marker', async () => {
        const session = makeSession('session-a');
        const resolution = await resolveExportFile(session, historyDir);
        await fs.writeFile(resolution.filepath, '# 同名会话\n_Exported on 01/10/2026_\n\n**User**\n\nhello\n\n---\n', 'utf8');

        expect(await resolveExportFile(session, historyDir))
            .toEqual({ filepath: resolution.filepath, exists: true });
    });

    it('embeds the session marker in new exports', () => {
        expect(formatSessionMarkdown(makeSession('session/a')))
            .toContain('<!-- waylog-session-id: session/a -->');
    });
});
