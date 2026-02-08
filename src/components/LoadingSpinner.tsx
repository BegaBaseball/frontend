import { Loader2 } from 'lucide-react';

export default function LoadingSpinner() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background transition-colors duration-200">
            <div className="text-center">
                <Loader2 className="inline-block animate-spin h-12 w-12 text-primary" />
                <p className="mt-4 text-muted-foreground font-medium text-lg">로딩 중...</p>
            </div>
        </div>
    );
}