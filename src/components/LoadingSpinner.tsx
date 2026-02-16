interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    text?: string;
    fullScreen?: boolean;
}

const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
};

export default function LoadingSpinner({ size = 'lg', text = '로딩 중...', fullScreen = true }: LoadingSpinnerProps) {
    return (
        <div className={`flex flex-col items-center justify-center ${fullScreen ? 'min-h-screen bg-background' : 'py-12'}`}>
            <div className="text-center">
                <div className={`inline-block animate-spin rounded-full border-b-2 border-primary ${sizeClasses[size]}`} />
                {text && <p className="mt-4 text-muted-foreground font-medium text-lg">{text}</p>}
            </div>
        </div>
    );
}
