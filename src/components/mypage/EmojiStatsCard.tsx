import { EmojiStat } from '../../types/diary';

interface EmojiStatsCardProps {
  stats: EmojiStat[];
}

export default function EmojiStatsCard({ stats }: EmojiStatsCardProps) {
  return (
    <div className="flex items-center justify-around mb-6">
      {stats.map((item, index) => (
        <div key={index} className="text-center">
          <img
            src={item.emoji}
            alt={item.name}
            className="w-20 h-20 mx-auto mb-2 object-contain"
          />
          <div className="text-2xl mb-1" style={{ fontWeight: 900, color: '#2d5f4f' }}>
            {item.count}
          </div>
          <div className="text-sm text-gray-600">{item.name}</div>
        </div>
      ))}
    </div>
  );
}