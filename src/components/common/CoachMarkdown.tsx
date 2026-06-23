import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface CoachMarkdownProps {
    children: string;
    className?: string;
}

const componentMap: Components = {
    h1: ({ children }) => (
        <h3 className="mt-3 mb-2 text-lg font-bold text-gray-900 first:mt-0 dark:text-white">
            {children}
        </h3>
    ),
    h2: ({ children }) => (
        <h3 className="mt-4 mb-2 text-base font-bold text-gray-900 first:mt-0 dark:text-white">
            {children}
        </h3>
    ),
    h3: ({ children }) => (
        <h4 className="mt-3 mb-2 text-base font-bold text-gray-800 first:mt-0 dark:text-white">
            {children}
        </h4>
    ),
    h4: ({ children }) => (
        <h5 className="mt-3 mb-1 text-[15px] font-bold text-gray-800 first:mt-0 dark:text-white">
            {children}
        </h5>
    ),
    p: ({ children }) => (
        <p className="mb-2 text-[15px] leading-relaxed text-gray-700 last:mb-0 dark:text-white">
            {children}
        </p>
    ),
    ul: ({ children }) => (
        <ul className="mb-2 list-disc space-y-1 pl-5 text-[15px] leading-relaxed text-gray-700 last:mb-0 dark:text-white">
            {children}
        </ul>
    ),
    ol: ({ children }) => (
        <ol className="mb-2 list-decimal space-y-1 pl-5 text-[15px] leading-relaxed text-gray-700 last:mb-0 dark:text-white">
            {children}
        </ol>
    ),
    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
    strong: ({ children }) => (
        <strong className="font-bold text-gray-900 dark:text-white">{children}</strong>
    ),
    em: ({ children }) => (
        <em className="italic text-gray-700 dark:text-white">{children}</em>
    ),
    a: ({ href, children }) => (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline underline-offset-2 hover:text-blue-700 dark:text-blue-400"
        >
            {children}
        </a>
    ),
    code: ({ children }) => (
        <code className="rounded bg-gray-100 px-1 py-0.5 text-[13px] text-gray-800 dark:bg-gray-800 dark:text-white">
            {children}
        </code>
    ),
    blockquote: ({ children }) => (
        <blockquote className="my-2 border-l-2 border-gray-300 pl-3 text-gray-600 dark:border-gray-600 dark:text-white">
            {children}
        </blockquote>
    ),
    table: ({ children }) => (
        <div className="my-3 overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="min-w-full divide-y divide-gray-200 text-left text-[14px] dark:divide-gray-700">
                {children}
            </table>
        </div>
    ),
    thead: ({ children }) => (
        <thead className="bg-gray-50 text-gray-700 dark:bg-gray-900/50 dark:text-white">
            {children}
        </thead>
    ),
    tbody: ({ children }) => (
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {children}
        </tbody>
    ),
    th: ({ children }) => (
        <th className="px-3 py-2 font-bold">
            {children}
        </th>
    ),
    td: ({ children }) => (
        <td className="px-3 py-2 align-top text-gray-700 dark:text-white">
            {children}
        </td>
    ),
    hr: () => <hr className="my-3 border-gray-200 dark:border-gray-700" />,
};

export default function CoachMarkdown({ children, className }: CoachMarkdownProps) {
    const source = typeof children === 'string' ? children : '';
    if (!source.trim()) return null;

    return (
        <div className={className}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={componentMap}
                skipHtml
            >
                {source}
            </ReactMarkdown>
        </div>
    );
}
