import SimpleMarkdownContent from './SimpleMarkdownContent';
import privacyContent from '../../docs/terms_of_service.md?raw';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background transition-colors duration-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white dark:bg-card rounded-lg shadow-lg">
        <div className="px-6 py-8 sm:p-10">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 border-b border-zinc-200/80 dark:border-border pb-4">
            개인정보처리방침
          </h1>
          <SimpleMarkdownContent content={privacyContent} />
        </div>
      </div>
    </div>
  );
}
