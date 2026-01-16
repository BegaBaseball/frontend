import { useEffect, useState } from 'react';
import { Flame } from 'lucide-react';
import { fetchPosts, CheerPost } from '../api/cheerApi';
import CheerCard from './CheerCard';

export default function CheerHot() {
    const [hotPosts, setHotPosts] = useState<CheerPost[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadHotPosts = async () => {
            try {
                // Fetch top 5 posts sorted by likes
                const data = await fetchPosts('all', 0, 5, undefined, 'likeCount,desc');
                setHotPosts(data.content);
            } catch (error) {
                console.error("Failed to load hot posts", error);
            } finally {
                setLoading(false);
            }
        };

        loadHotPosts();
    }, []);

    if (loading || hotPosts.length === 0) return null;

    return (
        <div className="bg-red-50/50 dark:bg-[#151A23] rounded-2xl p-5 border border-red-100 dark:border-red-500/30">
            <div className="flex items-center gap-2 mb-4">
                <Flame className="w-5 h-5 text-red-500 fill-red-500 dark:text-red-400 dark:fill-red-400" />
                <h2 className="text-lg font-bold text-red-500 dark:text-red-400">HOT 게시물</h2>
            </div>

            <div className="space-y-3">
                {hotPosts.map(post => (
                    <CheerCard key={post.id} post={post} isHotItem />
                ))}
            </div>
        </div>
    );
}
