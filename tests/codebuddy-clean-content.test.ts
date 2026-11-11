import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { CodeBuddyReader } from '../src/services/readers/codebuddy-reader';
import { createProjectHistory } from './helpers/codebuddy-fixture';

describe('CodeBuddyReader message cleaning', () => {
    let root: string;

    beforeEach(() => {
        root = fs.mkdtempSync(path.join(os.tmpdir(), 'waylog-codebuddy-'));
    });

    afterEach(() => {
        fs.rmSync(root, { recursive: true, force: true });
    });

    it('strips injected rules blocks and keeps the real question', async () => {
        const injected = '<user_info>OS: linux</user_info><rules>secret rules block\nsecond line</rules>真正的问题';
        const projectDir = createProjectHistory(
            root,
            [{ id: 'session-a', name: '' }],
            [{ id: 'session-a', messages: [{ id: 'm1', role: 'user', content: injected }] }]
        );

        const sessions = await new CodeBuddyReader().getSessions(projectDir);

        expect(sessions[0].messages[0].content).toBe('真正的问题');
        expect(sessions[0].title).toBe('真正的问题');
    });

    it('keeps user_query content while removing its tags', async () => {
        const projectDir = createProjectHistory(
            root,
            [{ id: 'session-b', name: '' }],
            [{ id: 'session-b', messages: [{ id: 'm1', role: 'user', content: '<user_query>保留这段提问</user_query>' }] }]
        );

        const sessions = await new CodeBuddyReader().getSessions(projectDir);

        expect(sessions[0].messages[0].content).toBe('保留这段提问');
    });

    it('still strips the pre-existing metadata blocks', async () => {
        const projectDir = createProjectHistory(
            root,
            [{ id: 'session-c', name: '' }],
            [{ id: 'session-c', messages: [{ id: 'm1', role: 'user', content: '<additional_data>hidden</additional_data>内容' }] }]
        );

        const sessions = await new CodeBuddyReader().getSessions(projectDir);

        expect(sessions[0].messages[0].content).toBe('内容');
    });
});
