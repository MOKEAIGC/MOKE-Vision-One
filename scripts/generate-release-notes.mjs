import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const STATUS_TITLES = {
  A: 'Added',
  M: 'Updated',
  D: 'Removed',
  R: 'Renamed',
};

function runGit(args) {
  return execFileSync('git', args, {
    cwd: projectRoot,
    encoding: 'utf8',
  }).trim();
}

function getArgValue(flagName) {
  const index = process.argv.indexOf(flagName);
  return index >= 0 ? process.argv[index + 1] : null;
}

function getGitLines(args) {
  const output = runGit(args);
  return output ? output.split(/\r?\n/).filter(Boolean) : [];
}

function formatPath(filePath) {
  return `\`${filePath}\``;
}

function formatPathList(paths) {
  if (paths.length === 1) {
    return formatPath(paths[0]);
  }

  if (paths.length <= 4) {
    return paths.map(formatPath).join(', ');
  }

  const visible = paths.slice(0, 4).map(formatPath).join(', ');
  return `${visible}, and ${paths.length - 4} more`;
}

function parseChangeLine(line) {
  const parts = line.split('\t');
  const rawStatus = parts[0] || '';
  const status = rawStatus[0];

  if (status === 'R') {
    const fromPath = parts[1];
    const toPath = parts[2];
    return {
      status: 'R',
      filePath: toPath,
      displayPath: `${fromPath} -> ${toPath}`,
    };
  }

  return {
    status,
    filePath: parts[1],
    displayPath: parts[1],
  };
}

function getGitRecordSeparatorOutput(args) {
  const output = execFileSync('git', args, {
    cwd: projectRoot,
    encoding: 'utf8',
  });

  return output ? output.split('\x1e').map((item) => item.trim()).filter(Boolean) : [];
}

function resolveCommitRef(ref) {
  return runGit(['rev-parse', `${ref}^{commit}`]);
}

function getInitialTagRange(currentTag) {
  const currentCommit = resolveCommitRef(currentTag);
  const parentLine = getGitLines(['rev-list', '--parents', '-n', '1', currentCommit])[0] || '';
  const parents = parentLine.split(' ').slice(1).filter(Boolean);

  if (parents.length > 0) {
    return {
      diffLines: getGitLines(['diff', '--find-renames', '--name-status', `${parents[0]}..${currentCommit}`]),
      logRecords: getGitRecordSeparatorOutput([
        'log',
        '--reverse',
        '--first-parent',
        '--format=%s%x1f%b%x1e',
        `${parents[0]}..${currentCommit}`,
      ]),
    };
  }

  return {
    diffLines: getGitLines(['show', '--format=', '--find-renames', '--name-status', currentCommit]),
    logRecords: getGitRecordSeparatorOutput([
      'log',
      '--reverse',
      '--first-parent',
      '--format=%s%x1f%b%x1e',
      currentCommit,
    ]),
  };
}

function collectChanges(diffRange, currentTag, previousTag, initialTagRange) {
  const lines = previousTag
    ? getGitLines(['diff', '--find-renames', '--name-status', diffRange])
    : initialTagRange.diffLines;

  return lines.map(parseChangeLine);
}

function normalizeCommitSummary(subject, body) {
  const bodyLines = body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('Co-authored-by:'));

  if (/^Merge pull request #\d+/i.test(subject) && bodyLines.length > 0) {
    return bodyLines[0];
  }

  return subject.trim();
}

function isReleaseBookkeepingSummary(summary) {
  return /^chore:\s*bump version to\b/i.test(summary) || /^release\b/i.test(summary);
}

function isReleaseBookkeepingPath(filePath) {
  return filePath === 'package.json' || filePath === 'package-lock.json';
}

function collectCommitSummaries(diffRange, currentTag, previousTag, initialTagRange) {
  const records = previousTag
    ? getGitRecordSeparatorOutput(['log', '--reverse', '--first-parent', '--format=%s%x1f%b%x1e', diffRange])
    : initialTagRange.logRecords;

  const summaries = [];
  const seen = new Set();

  for (const record of records) {
    const [subject = '', body = ''] = record.split('\x1f');
    const summary = normalizeCommitSummary(subject, body);
    if (!summary || seen.has(summary)) {
      continue;
    }

    seen.add(summary);
    summaries.push(summary);
  }

  return summaries;
}

function getScopeName(filePath) {
  const normalizedPath = filePath.replace(/\\/g, '/');

  if (!normalizedPath.includes('/')) {
    return 'repo root';
  }

  const segments = normalizedPath.split('/');
  if (segments[0].startsWith('.') && segments.length > 1) {
    return `${segments[0]}/${segments[1]}`;
  }

  return segments[0];
}

function buildCommitSection(commitSummaries) {
  if (commitSummaries.length === 0) {
    return ['### Included changes', '- No commit summaries were detected for this tag.'];
  }

  return [
    '### Included changes',
    ...commitSummaries.map((summary) => `- ${summary}`),
  ];
}

function buildScopeSection(changes) {
  if (changes.length === 0) {
    return ['### Changed files', '- No tracked file changes were detected for this tag.'];
  }

  const grouped = new Map();

  for (const change of changes) {
    const scope = getScopeName(change.filePath);
    if (!grouped.has(scope)) {
      grouped.set(scope, []);
    }
    grouped.get(scope).push(change);
  }

  const bullets = [];
  const scopes = [...grouped.keys()].sort((left, right) => left.localeCompare(right));

  for (const scope of scopes) {
    const scopeChanges = grouped.get(scope);
    const byStatus = new Map();

    for (const change of scopeChanges) {
      if (!byStatus.has(change.status)) {
        byStatus.set(change.status, []);
      }
      byStatus.get(change.status).push(change.displayPath);
    }

    const parts = [];
    for (const status of ['A', 'M', 'R', 'D']) {
      const statusChanges = byStatus.get(status);
      if (!statusChanges || statusChanges.length === 0) {
        continue;
      }

      const sortedPaths = [...statusChanges].sort((left, right) => left.localeCompare(right));
      parts.push(`${STATUS_TITLES[status]} ${formatPathList(sortedPaths)}`);
    }

    if (parts.length === 0) {
      continue;
    }

    bullets.push(`- **${scope}**: ${parts.join('; ')}.`);
  }

  return ['### Changed files', ...bullets];
}

function preferProductChanges(items, predicate) {
  const filtered = items.filter((item) => !predicate(item));
  return filtered.length > 0 ? filtered : items;
}

const currentTag = getArgValue('--current-tag') || process.env.GITHUB_REF_NAME;
const outputPathArg = getArgValue('--output');

if (!currentTag) {
  throw new Error('Missing release tag. Pass --current-tag or set GITHUB_REF_NAME.');
}

const tags = getGitLines(['tag', '--sort=-version:refname']);
const currentTagIndex = tags.indexOf(currentTag);
const previousTag = currentTagIndex >= 0 ? tags.slice(currentTagIndex + 1).find(Boolean) || null : tags.find((tag) => tag !== currentTag) || null;
const diffRange = previousTag ? `${previousTag}..${currentTag}` : currentTag;
const initialTagRange = previousTag ? null : getInitialTagRange(currentTag);
const changes = collectChanges(diffRange, currentTag, previousTag, initialTagRange);
const visibleChanges = preferProductChanges(changes, (change) => isReleaseBookkeepingPath(change.filePath));
const commitSummaries = preferProductChanges(
  collectCommitSummaries(diffRange, currentTag, previousTag, initialTagRange),
  (summary) => isReleaseBookkeepingSummary(summary),
);
const changedFileCount = new Set(visibleChanges.map((change) => change.displayPath)).size;
const changedScopeCount = new Set(visibleChanges.map((change) => getScopeName(change.filePath))).size;

const lines = ['## What\'s Changed'];

if (previousTag && changedFileCount > 0) {
  lines.push(`- ${commitSummaries.length} commits across ${changedFileCount} files in ${changedScopeCount} scopes since ${previousTag}.`);
} else if (previousTag) {
  lines.push(`- Changes since ${previousTag}.`);
} else {
  lines.push('- Initial tagged release.');
}

lines.push('');
lines.push(...buildCommitSection(commitSummaries));
lines.push('');
lines.push(...buildScopeSection(visibleChanges));

const repository = process.env.GITHUB_REPOSITORY;
if (repository && previousTag) {
  lines.push('');
  lines.push(`**Full Changelog**: https://github.com/${repository}/compare/${previousTag}...${currentTag}`);
}

const releaseNotes = `${lines.join('\n')}\n`;

if (outputPathArg) {
  const outputPath = path.resolve(projectRoot, outputPathArg);
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, releaseNotes, 'utf8');
  console.log(`Wrote release notes to ${path.relative(projectRoot, outputPath)}`);
} else {
  process.stdout.write(releaseNotes);
}