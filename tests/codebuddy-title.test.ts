import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { CodeBuddyReader } from '../src/services/readers/codebuddy-reader';
import { createProjectHistory } from './helpers/codebuddy-fixture';

describe('CodeBuddyReader session titles', () => {
    let root: string;

    beforeEach(() => {
        root = fs.mkdtempSync(path.join(os.tmpdir(), 'waylog-codebuddy-'));
    });

    afterEach(() => {
        fs.rmSync(root, { recursive: true, force: true });
    });

    it('prefers the conversation name stored in index.json', async () => {
        const projectDir = createProjectHistory(
            root,
            [{ id: 'session-a', name: '真实会话名称' }],
            [{ id: 'session-a', messages: [{ id: 'm1', role: 'user', content: '首条提问' }] }]
        );

        const sessions = await new CodeBuddyReader().getSessions(projectDir);

        expect(sessions).toHaveLength(1);
        expect(sessions[0].title).toBe('真实会话名称');
    });

    it('falls back to the first user message when the name is missing', async () => {
        const projectDir = createProjectHistory(
            root,
            [{ id: 'session-b', name: '' }],
            [{ id: 'session-b', messages: [{ id: 'm1', role: 'user', content: '首条提问内容' }] }]
        );

        const sessions = await new CodeBuddyReader().getSessions(projectDir);

        expect(sessions).toHaveLength(1);
        expect(sessions[0].title).toBe('首条提问内容');
    });
});
