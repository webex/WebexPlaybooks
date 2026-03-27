/**
 * Preview footer appended to Contentstack description for integration PR publishes.
 * Stripped on production republish from APPHUB.yaml.
 *
 * Delimiters use Markdown reference definitions ([//]: # (...)) so they stay invisible
 * in Markdown UIs that hide link refs. HTML <!-- --> comments were visible in CMS.
 */

/** @deprecated kept for stripPreviewFooter backward compatibility */
const LEGACY_MARKER_BEGIN = '<!-- webex-playbooks-preview:begin -->';
/** @deprecated kept for stripPreviewFooter backward compatibility */
const LEGACY_MARKER_END = '<!-- webex-playbooks-preview:end -->';

const MARKER_BEGIN = '[//]: # (webex-playbooks-preview-begin)';
const MARKER_END = '[//]: # (webex-playbooks-preview-end)';

function stripBetweenMarkers(text, begin, end) {
  const s = String(text ?? '');
  const start = s.indexOf(begin);
  if (start === -1) return s;
  const endIdx = s.indexOf(end, start);
  if (endIdx === -1) return s.slice(0, start).trimEnd();
  const before = s.slice(0, start);
  const after = s.slice(endIdx + end.length);
  return (before + after).trimEnd();
}

function stripPreviewFooter(description) {
  let text = String(description ?? '');
  text = stripBetweenMarkers(text, MARKER_BEGIN, MARKER_END);
  text = stripBetweenMarkers(text, LEGACY_MARKER_BEGIN, LEGACY_MARKER_END);
  return text.trimEnd();
}

function appendPreviewFooter(description, prUrl) {
  const base = stripPreviewFooter(description);
  const url = String(prUrl || '').trim();
  if (!url) return base;

  const body = [
    MARKER_BEGIN,
    '',
    '---',
    '',
    '**Preview listing**',
    '',
    `This App Hub entry was published from an open pull request. [Review the change](${url}).`,
    '',
    MARKER_END
  ].join('\n');

  const combined = base ? `${base.trimEnd()}\n\n${body}` : body;
  return combined;
}

module.exports = {
  MARKER_BEGIN,
  MARKER_END,
  stripPreviewFooter,
  appendPreviewFooter
};
