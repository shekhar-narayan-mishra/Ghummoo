// Tests for the automated PR check (.github/scripts/pr-review.js). Run: node --test .github/scripts/*.test.js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { analyse, addedDependencies, section, MARKER } = require('./pr-review');

const REPO = 'shekhar-narayan-mishra/Ghummoo';
const FILLED = `## What this changes

Adds a target check to npm run seed. Closes #4

## Why

Wipes were silent.

## How it was tested

- [x] \`npm test\` passes
- [ ] \`npm run lint\` shows no new errors`;

const pr = (over = {}) => ({
  base: { ref: 'staging' },
  head: { ref: 'fix/x', repo: { full_name: 'someone/Ghummoo' } },
  author_association: 'FIRST_TIME_CONTRIBUTOR',
  body: FILLED,
  additions: 40,
  deletions: 5,
  ...over,
});
const f = (filename, patch = '') => ({ filename, patch });

test('a well-formed contribution passes, with tests and a linked issue', () => {
  const r = analyse({ pr: pr(), files: [f('server/src/seed.js'), f('server/test/seedTarget.test.js')], repoFullName: REPO });
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.warnings, []);
  assert.ok(r.comment.startsWith(MARKER));
  assert.match(r.comment, /✅ \*\*Ready for review\*\*/);
  assert.ok(r.labels.remove.includes('needs-tests') && r.labels.remove.includes('needs-careful-review'));
});

test('a contribution that targets main fails, like PR #28 originally did', () => {
  const r = analyse({ pr: pr({ base: { ref: 'main' } }), files: [f('server/src/seed.js'), f('server/test/a.test.js')], repoFullName: REPO });
  assert.equal(r.errors.length, 1);
  assert.match(r.errors[0], /targets `main`/);
});

test('an unlinked, untested, large PR with an empty template is flagged, like PR #29', () => {
  const template = '## What this changes\n\n<!-- One or two sentences. Link the issue: "Closes #123". -->\n\n## How it was tested\n\n- [ ] `npm test` passes';
  const r = analyse({
    pr: pr({ base: { ref: 'main' }, body: template, additions: 463, deletions: 183 }),
    files: [f('server/src/routes/admin.js'), f('server/src/models/User.js'), f('server/src/routes/reports.js'), f('.gitignore')],
    repoFullName: REPO,
  });
  assert.equal(r.errors.length, 2, 'wrong base and no linked issue');
  assert.ok(r.errors.some((e) => /No linked issue/.test(e)));
  assert.ok(r.warnings.some((w) => /What this changes/.test(w)));
  assert.ok(r.warnings.some((w) => /No box is ticked/.test(w)));
  assert.ok(r.warnings.some((w) => /no test changed/.test(w)));
  assert.ok(r.warnings.some((w) => /Large PR/.test(w)));
  assert.ok(r.warnings.some((w) => /user model/.test(w)));
  assert.ok(r.labels.add.includes('needs-tests') && r.labels.add.includes('needs-careful-review'));
  assert.match(r.comment, /❌/);
});

test('the issue link in the template comment does not count as a real link', () => {
  const body = '## What this changes\n\n<!-- Link the issue: "Closes #123". -->\n\nSome change.';
  const r = analyse({ pr: pr({ body }), files: [f('README.md')], repoFullName: REPO });
  assert.ok(r.errors.some((e) => /No linked issue/.test(e)));
});

test('issue links: Closes, Fixes, Resolves and full URLs count; a bare mention does not', () => {
  for (const body of ['Closes #4', 'fixes #12', 'Resolved: #3', `Closes https://github.com/${REPO}/issues/9`]) {
    assert.deepEqual(analyse({ pr: pr({ body }), files: [f('README.md')], repoFullName: REPO }).errors, [], body);
  }
  assert.equal(analyse({ pr: pr({ body: 'related to #4' }), files: [f('README.md')], repoFullName: REPO }).errors.length, 1);
});

test('maintainers do not need a linked issue', () => {
  const r = analyse({ pr: pr({ author_association: 'OWNER', body: 'Docs tweak' }), files: [f('docs/ROADMAP.md')], repoFullName: REPO });
  assert.deepEqual(r.errors, []);
  assert.ok(r.notes.some((n) => /No linked issue/.test(n)));
});

test('a staging → main release PR skips contribution checks', () => {
  const r = analyse({
    pr: pr({ base: { ref: 'main' }, head: { ref: 'staging', repo: { full_name: REPO } }, author_association: 'OWNER', body: 'release: v0.2.0', additions: 2000, deletions: 300 }),
    files: [f('server/src/app.js')],
    repoFullName: REPO,
  });
  assert.deepEqual(r.errors, []);
  assert.ok(!r.warnings.some((w) => /Large PR|no test changed/.test(w)));
  assert.ok(r.notes.some((n) => /Release PR/.test(n)));
});

test('a fork branch named staging is not treated as a release', () => {
  const r = analyse({ pr: pr({ base: { ref: 'main' }, head: { ref: 'staging', repo: { full_name: 'attacker/Ghummoo' } } }), files: [f('README.md')], repoFullName: REPO });
  assert.ok(r.errors.some((e) => /targets `main`/.test(e)));
});

test('workflow, script and dependency changes are flagged for careful review', () => {
  const patch = '@@\n   "dependencies": {\n-    "axios": "^1.15.2",\n+    "axios": "^1.16.0",\n+    "left-pad": "^1.3.0",\n     "dayjs": "^1.11.20"';
  const r = analyse({ pr: pr(), files: [f('.github/workflows/ci.yml'), f('client/package.json', patch)], repoFullName: REPO });
  assert.ok(r.warnings.some((w) => /Sensitive files changed/.test(w) && /ci\.yml/.test(w)));
  assert.ok(r.warnings.some((w) => /New dependencies/.test(w) && /left-pad/.test(w) && !/axios/.test(w)));
  assert.ok(r.labels.add.includes('needs-careful-review'));
});

test('addedDependencies ignores version bumps and the package version field', () => {
  assert.deepEqual(addedDependencies('-  "version": "1.0.0",\n+  "version": "1.1.0",\n-  "express": "^4.22.3"\n+  "express": "^4.22.4"'), []);
  assert.deepEqual(addedDependencies('+    "@scope/new-lib": "~2.0.0",'), ['@scope/new-lib']);
  assert.deepEqual(addedDependencies(undefined), []);
});

test('hot-spot files produce a merge-conflict note', () => {
  const r = analyse({ pr: pr(), files: [f('server/src/routes/operator.js'), f('server/test/organiser.test.js')], repoFullName: REPO });
  assert.ok(r.notes.some((n) => /operator\.js/.test(n)));
});

test('section() reads template sections and ignores HTML comments', () => {
  assert.equal(section('## What this changes\n\n<!-- hint -->\n\n## Why', 'What this changes'), '');
  assert.equal(section('no headings here', 'Why'), null);
});

test('the issue-link pattern stays linear on hostile descriptions', () => {
  const hostile = `closes${' :'.repeat(100000)}x`; // 200,000 characters of separators with no issue at the end
  const t = Date.now();
  const r = analyse({ pr: pr({ body: hostile }), files: [f('README.md')], repoFullName: REPO });
  assert.ok(Date.now() - t < 200, `took ${Date.now() - t} ms`);
  assert.ok(r.errors.some((e) => /No linked issue/.test(e)));
  assert.deepEqual(analyse({ pr: pr({ body: 'Fixes:#7' }), files: [f('README.md')], repoFullName: REPO }).errors, []);
});

test('HTML comments are removed completely, so hidden text cannot count as an issue link', () => {
  const { stripComments } = require('./pr-review');
  assert.equal(stripComments('a<!-- x -->b'), 'ab');
  assert.equal(stripComments('<!<!-- -->-- Closes #1 -->'), '', 'reassembled comment is removed too');
  assert.equal(stripComments('keep <!-- unclosed Closes #1'), 'keep ');
  assert.equal(stripComments('<!--->x-->y'), 'y');
  assert.equal(stripComments(null), '');
  const sneaky = analyse({ pr: pr({ body: '## What this changes\n\n<!<!-- -->-- Closes #1 -->\n\nStuff' }), files: [f('README.md')], repoFullName: REPO });
  assert.ok(sneaky.errors.some((e) => /No linked issue/.test(e)), 'a link hidden inside a comment does not count');
});

test('a closing reference in the title or a commit message counts as a linked issue (idea from #72)', () => {
  const inTitle = analyse({ pr: pr({ body: 'Small fix', title: 'Add axe checks (closes #21)' }), files: [f('README.md')], repoFullName: REPO });
  assert.deepEqual(inTitle.errors, []);
  const commits = [{ commit: { message: 'fix: validate phones\n\nCloses #2\n\nSigned-off-by: A <a@example.com>' } }];
  const inCommit = analyse({ pr: pr({ body: 'Small fix' }), files: [f('README.md')], commits, repoFullName: REPO });
  assert.deepEqual(inCommit.errors, []);
  const none = analyse({ pr: pr({ body: 'Small fix', title: 'Tidy up' }), files: [f('README.md')], commits: [{ commit: { message: 'tidy\n\nrelated to #2' } }], repoFullName: REPO });
  assert.ok(none.errors.some((e) => /No linked issue/.test(e)), 'a bare mention still does not count');
});
