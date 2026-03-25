/**
 * Preview footer appended to Contentstack description for integration PR publishes.
 * Stripped on production republish from APPHUB.yaml.
 */

const MARKER_BEGIN = '<!-- webex-playbooks-preview:begin -->';
const MARKER_END = '<!-- webex-playbooks-preview:end -->';

function stripPreviewFooter(description) {
  const text = String(description ?? '');
  const start = text.indexOf(MARKER_BEGIN);
  if (start === -1) return text.trimEnd();
  const end = text.indexOf(MARKER_END, start);
  if (end === -1) return text.slice(0, start).trimEnd();
  const before = text.slice(0, start);
  const after = text.slice(end + MARKER_END.length);
  return (before + after).trimEnd();
}

function appendPreviewFooter(description, prUrl) {
  const base = stripPreviewFooter(description);
  const url = String(prUrl || '').trim();
  if (!url) return base;

  const block = [
    '',
    MARKER_BEGIN,
    'Preview listing: this App Hub entry was published from an open pull request.',
    `Review the change: ${url}`,
    MARKER_END
  ].join('\n');

  const combined = base ? `${base}${block}` : block.trimStart();
  return combined;
}

module.exports = {
  MARKER_BEGIN,
  MARKER_END,
  stripPreviewFooter,
  appendPreviewFooter
};
