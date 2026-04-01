import { renderMarkdownToHtml } from '../utils/simpleMarkdown';

type SimpleMarkdownContentProps = {
  content: string;
  className?: string;
};

export default function SimpleMarkdownContent({
  content,
  className = 'prose prose-lg max-w-none dark:prose-invert',
}: SimpleMarkdownContentProps) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(content) }} />;
}
