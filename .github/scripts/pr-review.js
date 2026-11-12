/* Automated first-pass review of a pull request, used by .github/workflows/pr-review.yml.
   It is a pure function of the PR's metadata and file list: it never checks out, installs or
   runs code from the PR, which is what makes it safe to run with a write token for fork PRs.

   Returns { errors, warnings, notes, labels, comment }:
   - errors   fail the "PR checklist" check (wrong target branch, no linked issue);
   - warnings and notes appear in the PR comment and drive labels, but don't fail the check. */

const MARKER = '<!-- ghumo-pr-review -->';

// Changes here can affect CI, secrets, dependencies, auth or roles: read the diff before
// clicking "Approve and run workflows" for a first-time contributor.
const SENSITIVE = [
  [/^\.github\//, 'GitHub configuration or workflows'],
  [/(^|\/)package\.json$/, 'package.json (dependencies or npm scripts)'],
  [/(^|\/)package-lock\.json$/, 'lockfile'],
  [/^scripts\//, 'repository scripts'],
  [/^\.gitleaks\.toml$/, 'secret-scan allowlist'],
  [/^(playwright\.config\.js|e2e\/(start-app|ai-stub)\.js)$/, 'test harness'],
  [/^server\/src\/middleware\//, 'auth, roles or rate limits'],
  [/^server\/src\/routes\/auth\.js$/, 'sign-in and registration'],
  [/^server\/src\/models\/User\.js$/, 'user model'],
  [/^server\/src\/config\//, 'database configuration'],
  [/^server\/src\/services\/seats\.js$/, 'seat inventory'],
  [/^server\/src\/services\/ai\//, 'AI grounding'],
];

// Files that several open issues edit; parallel PRs here tend to conflict.
const HOTSPOTS = [
  'server/src/routes/operator.js',
  'server/src/services/ai/index.js',
  'server/src/routes/auth.js',
  'server/src/routes/bookings.js',
  'server/src/app.js',
  'client/src/main.jsx',
];

const CODE = /^(server\/src|client\/src)\/.+\.(js|jsx|mjs|cjs)$/;
const TESTS = /^(server\/test|client\/test|e2e)\//;
const ISSUE_LINK = /\b(close[sd]?|fix(e[sd])?|resolve[sd]?)\b[\s:]*(#\d+|https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/issues\/\d+)/i;
const LARGE = 500;

// Removes HTML comments the way GitHub hides them when rendering: repeatedly, until none is
// left, so a crafted "<!<!-- -->-- Closes #1 -->" cannot reassemble into hidden text that still
// counts. An unclosed "<!--" hides everything after it. A plain scan, no regex (CodeQL
// js/incomplete-multi-character-sanitization).
function stripComments(s) {
  let out = String(s || '');
  for (let i = out.indexOf('<!--'); i !== -1; i = out.indexOf('<!--')) {
    const end = out.indexOf('-->', i + 4);
    out = end === -1 ? out.slice(0, i) : out.slice(0, i) + out.slice(end + 3);
  }
  return out;
}

function section(body, heading) {
  const text = stripComments(body);
  const start = text.indexOf(`## ${heading}`);
  if (start === -1) return null;
  const rest = text.slice(start + heading.length + 3);
  const end = rest.search(/\n##\s/);
  return (end === -1 ? rest : rest.slice(0, end)).trim();
}

// Dependencies added (not merely re-versioned) in a package.json patch.
function addedDependencies(patch) {
  const names = (sign) => new Set(String(patch || '').split('\n')
    .filter((l) => l.startsWith(sign) && !l.startsWith(`${sign}${sign}`))
    .map((l) => l.slice(1).match(/^\s*"(@?[\w.\-/]+)"\s*:\s*"[~^>=<*]?\s*\d/))
    .filter(Boolean)
    .map((m) => m[1])
    .filter((n) => !['version', 'node', 'npm'].includes(n)));
  const before = names('-');
  return [...names('+')].filter((n) => !before.has(n));
}

function analyse({ pr, files, commits = [], repoFullName }) {
  const errors = [];
  const warnings = [];
  const notes = [];
  const paths = files.map((f) => f.filename);
  const maintainer = ['OWNER', 'MEMBER', 'COLLABORATOR'].includes(pr.author_association);
  const release = pr.base.ref === 'main' && pr.head.ref === 'staging' && pr.head.repo && pr.head.repo.full_name === repoFullName;

  // 1. Target branch
  if (pr.base.ref === 'main' && !release) {
    errors.push('This PR targets `main`. Contributions go to **`staging`**: use **Edit** next to the PR title and change the base branch to `staging`.');
  } else if (pr.base.ref !== 'staging' && pr.base.ref !== 'main') {
    warnings.push(`This PR targets \`${pr.base.ref}\`. Contributions normally go to \`staging\`.`);
  }

  // 2. Linked issue (maintainers and release PRs are exempt)
  // A closing reference counts in the description, the title or any commit message: contributors
  // often write "(closes #21)" in the title or "Closes #2" in the commit.
  const sources = [pr.body, pr.title, ...commits.map((c) => c && c.commit && c.commit.message)];
  const linksIssue = sources.some((text) => ISSUE_LINK.test(stripComments(text)));
  if (!release && !maintainer && !linksIssue) {
    errors.push('No linked issue. Add a line such as **`Closes #12`** to the description, the title or a commit message. Every contribution should start from an issue (see CONTRIBUTING.md).');
  } else if (!release && maintainer && !linksIssue) {
    notes.push('No linked issue (fine for maintainer changes).');
  }

  // 3. Template filled in
  if (!release) {
    const what = section(pr.body, 'What this changes');
    if (what !== null && what.replace(/\s/g, '') === '') warnings.push('The **What this changes** section of the template is empty.');
    const tested = section(pr.body, 'How it was tested');
    if (tested !== null && !/- \[x\]/i.test(tested)) warnings.push('No box is ticked under **How it was tested**. Say which checks you ran.');
  }

  // 4. Sensitive files
  const sensitive = [];
  for (const p of paths) {
    const hit = SENSITIVE.find(([re]) => re.test(p));
    if (hit) sensitive.push(`\`${p}\` (${hit[1]})`);
  }
  if (sensitive.length) {
    warnings.push(`**Sensitive files changed.** Read these diffs before approving workflows or merging:\n${sensitive.map((s) => `  - ${s}`).join('\n')}`);
  }

  // 5. New dependencies
  const newDeps = files.filter((f) => /(^|\/)package\.json$/.test(f.filename)).flatMap((f) => addedDependencies(f.patch).map((d) => `\`${d}\` in \`${f.filename}\``));
  if (newDeps.length) {
    warnings.push(`**New dependencies:** ${newDeps.join(', ')}. CONTRIBUTING.md asks for a reason, the size, the licence and the maintenance status of each.`);
  }

  // 6. Tests
  const codeChanged = paths.filter((p) => CODE.test(p));
  const testsChanged = paths.some((p) => TESTS.test(p));
  if (!release && codeChanged.length && !testsChanged) {
    warnings.push(`Application code changed (${codeChanged.length} file${codeChanged.length > 1 ? 's' : ''}) but no test changed. New behaviour needs a test in \`server/test/\`, \`client/test/\` or \`e2e/\`.`);
  }

  // 7. Size
  const size = (pr.additions || 0) + (pr.deletions || 0);
  if (!release && size > LARGE) {
    warnings.push(`Large PR: +${pr.additions}/−${pr.deletions}. Smaller PRs are reviewed faster. Consider splitting it by issue.`);
  }

  // 8. Conflict hot spots
  const hot = paths.filter((p) => HOTSPOTS.includes(p));
  if (hot.length) notes.push(`Touches files that several open issues also edit (${hot.map((h) => `\`${h}\``).join(', ')}). Merge conflicts are likely if other PRs are open.`);

  if (release) notes.push('Release PR (`staging` → `main`): the issue-link, template, test and size checks are skipped.');

  const labels = {
    add: [],
    remove: [],
  };
  (sensitive.length || newDeps.length ? labels.add : labels.remove).push('needs-careful-review');
  (!release && codeChanged.length && !testsChanged ? labels.add : labels.remove).push('needs-tests');

  const comment = render({ errors, warnings, notes, pr, files, size });
  return { errors, warnings, notes, labels, comment };
}

function render({ errors, warnings, notes, pr, files, size }) {
  const status = errors.length ? '❌ **Needs changes before review**' : warnings.length ? '⚠️ **Ready for review, with points to check**' : '✅ **Ready for review**';
  const list = (items) => items.map((i) => `- ${i}`).join('\n');
  const blocks = [
    `${MARKER}\n### Automated PR check`,
    `${status} · ${files.length} file${files.length === 1 ? '' : 's'} · +${pr.additions || 0}/−${pr.deletions || 0}${size > LARGE ? ' (large)' : ''}`,
    errors.length ? `**Must fix**\n${list(errors)}` : null,
    warnings.length ? `**Check**\n${list(warnings)}` : null,
    notes.length ? `**Notes**\n${list(notes)}` : null,
    '<details><summary>What CI checks separately, and what a maintainer still checks by hand</summary>',
    '- **CI:** lint, unit and API tests, build, dependency audit, end-to-end tests, secret scan, CodeQL and DCO sign-off. All must pass.\n'
      + '- **By hand:** the change matches the issue; inputs are validated on the server; role and ownership checks are kept; no invented data (prices, seats, reviews); nothing implies online payments; private data is shown only to the right roles; it works on mobile and with a keyboard; it actually works when tried locally (`gh pr checkout <number>` then `npm run dev`).',
    '</details>',
    '<sub>This comment updates on every push. It reads the PR description and the file list only and never runs the PR\'s code.</sub>',
  ];
  return blocks.filter(Boolean).join('\n\n');
}

module.exports = { analyse, addedDependencies, section, stripComments, MARKER };
