import SimpleMarkdownContent from './SimpleMarkdownContent';

type DeferredMarkdownProps = {
  content: string;
  className?: string;
  fallbackClassName?: string;
};

export default function DeferredMarkdown({
  content,
  className,
  fallbackClassName = 'text-[15px] whitespace-pre-wrap break-words',
}: DeferredMarkdownProps) {
  return (
    <SimpleMarkdownContent
      content={content}
      className={className || fallbackClassName}
    />
  );
}
