import { ComponentType, useEffect, useState } from 'react';

type MarkdownRendererProps = {
  children: string;
  className?: string;
  remarkPlugins?: unknown[];
};

type MarkdownModules = {
  MarkdownRenderer: ComponentType<MarkdownRendererProps>;
  remarkGfm: unknown;
};

type DeferredMarkdownProps = {
  content: string;
  className?: string;
  fallbackClassName?: string;
};

let cachedMarkdownModules: MarkdownModules | null = null;
let markdownModulesPromise: Promise<MarkdownModules | null> | null = null;

const loadMarkdownModules = async (): Promise<MarkdownModules | null> => {
  if (cachedMarkdownModules) {
    return cachedMarkdownModules;
  }

  if (!markdownModulesPromise) {
    markdownModulesPromise = Promise.all([
      import('react-markdown'),
      import('remark-gfm'),
    ])
      .then(([markdownModule, remarkGfmModule]) => {
        cachedMarkdownModules = {
          MarkdownRenderer: markdownModule.default as ComponentType<MarkdownRendererProps>,
          remarkGfm: remarkGfmModule.default,
        };
        return cachedMarkdownModules;
      })
      .catch(() => null);
  }

  return markdownModulesPromise;
};

export default function DeferredMarkdown({
  content,
  className,
  fallbackClassName = 'text-sm whitespace-pre-wrap break-words',
}: DeferredMarkdownProps) {
  const [modules, setModules] = useState<MarkdownModules | null>(cachedMarkdownModules);

  useEffect(() => {
    let cancelled = false;

    if (!modules) {
      loadMarkdownModules().then((loadedModules) => {
        if (!cancelled) {
          setModules(loadedModules);
        }
      });
    }

    return () => {
      cancelled = true;
    };
  }, [modules]);

  if (!modules) {
    return <div className={fallbackClassName}>{content}</div>;
  }

  const { MarkdownRenderer, remarkGfm } = modules;

  return (
    <MarkdownRenderer className={className} remarkPlugins={[remarkGfm]}>
      {content}
    </MarkdownRenderer>
  );
}
