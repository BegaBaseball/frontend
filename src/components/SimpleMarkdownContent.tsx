type SimpleMarkdownContentProps = {
  content: string;
  className?: string;
};

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const renderInline = (value: string): string =>
  escapeHtml(value).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

const isListLine = (line: string) => /^(\s*)([-*]|\d+\.)\s+/.test(line);

const isTableLine = (line: string) => /^\|.*\|$/.test(line.trim());

const isTableDivider = (line: string) => /^\|\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(line.trim());

const splitTableRow = (line: string): string[] =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());

const renderList = (lines: string[], startIndex: number, baseIndent: number): [string, number] => {
  const firstMatch = lines[startIndex].match(/^(\s*)([-*]|\d+\.)\s+(.+)$/);
  if (!firstMatch) {
    return ['', startIndex];
  }

  const listTag = /\d+\./.test(firstMatch[2]) ? 'ol' : 'ul';
  let html = `<${listTag}>`;
  let index = startIndex;
  let hasOpenItem = false;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      break;
    }

    const match = line.match(/^(\s*)([-*]|\d+\.)\s+(.+)$/);
    if (!match) {
      break;
    }

    const indent = match[1].length;
    if (indent < baseIndent) {
      break;
    }

    if (indent > baseIndent) {
      const [nestedHtml, nextIndex] = renderList(lines, index, indent);
      html += nestedHtml;
      index = nextIndex;
      continue;
    }

    if (hasOpenItem) {
      html += '</li>';
    }

    html += `<li>${renderInline(match[3])}`;
    hasOpenItem = true;
    index += 1;
  }

  if (hasOpenItem) {
    html += '</li>';
  }

  html += `</${listTag}>`;
  return [html, index];
};

const renderTable = (lines: string[], startIndex: number): [string, number] => {
  const tableLines: string[] = [];
  let index = startIndex;

  while (index < lines.length && isTableLine(lines[index])) {
    tableLines.push(lines[index]);
    index += 1;
  }

  if (tableLines.length < 2) {
    return [`<p>${renderInline(tableLines[0] || '')}</p>`, index];
  }

  const [headerLine, ...bodyLines] = tableLines;
  const headers = splitTableRow(headerLine);
  const rows = bodyLines.filter((line) => !isTableDivider(line)).map(splitTableRow);

  const headerHtml = headers.map((cell) => `<th>${renderInline(cell)}</th>`).join('');
  const bodyHtml = rows
    .map((row) => `<tr>${row.map((cell) => `<td>${renderInline(cell)}</td>`).join('')}</tr>`)
    .join('');

  return [
    `<table><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`,
    index,
  ];
};

const renderMarkdownToHtml = (content: string): string => {
  const lines = content.replaceAll('\r\n', '\n').split('\n');
  const blocks: string[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      blocks.push(`<h${level}>${renderInline(headingMatch[2])}</h${level}>`);
      index += 1;
      continue;
    }

    if (isTableLine(line)) {
      const [tableHtml, nextIndex] = renderTable(lines, index);
      blocks.push(tableHtml);
      index = nextIndex;
      continue;
    }

    if (isListLine(line)) {
      const indent = line.match(/^(\s*)/)?.[1].length ?? 0;
      const [listHtml, nextIndex] = renderList(lines, index, indent);
      blocks.push(listHtml);
      index = nextIndex;
      continue;
    }

    const paragraphLines: string[] = [];
    while (
      index < lines.length
      && lines[index].trim()
      && !lines[index].trim().match(/^(#{1,6})\s+/)
      && !isListLine(lines[index])
      && !isTableLine(lines[index])
    ) {
      paragraphLines.push(lines[index].trim());
      index += 1;
    }

    blocks.push(`<p>${paragraphLines.map(renderInline).join('<br />')}</p>`);
  }

  return blocks.join('');
};

export default function SimpleMarkdownContent({
  content,
  className = 'prose prose-lg max-w-none dark:prose-invert',
}: SimpleMarkdownContentProps) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(content) }} />;
}
