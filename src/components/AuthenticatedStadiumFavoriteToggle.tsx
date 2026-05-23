import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  addStadiumFavorite,
  getMyFavoriteStadiumIds,
  removeStadiumFavorite,
} from '../api/stadium';
import { HeartIcon } from './icons/PublicShellIcons';

type AuthenticatedStadiumFavoriteToggleProps = {
  stadiumId: string;
};

export default function AuthenticatedStadiumFavoriteToggle({
  stadiumId,
}: AuthenticatedStadiumFavoriteToggleProps) {
  const queryClient = useQueryClient();

  const { data: favoriteIds = [] } = useQuery({
    queryKey: ['stadium-favorites'],
    queryFn: getMyFavoriteStadiumIds,
    staleTime: 5 * 60 * 1000,
  });

  const isFavorite = favoriteIds.includes(stadiumId);

  const favoriteMutation = useMutation({
    mutationFn: ({ id, currentlyFavorite }: { id: string; currentlyFavorite: boolean }) => (
      currentlyFavorite ? removeStadiumFavorite(id) : addStadiumFavorite(id)
    ),
    onMutate: async ({ id, currentlyFavorite }) => {
      await queryClient.cancelQueries({ queryKey: ['stadium-favorites'] });
      const prev = queryClient.getQueryData<string[]>(['stadium-favorites']) ?? [];
      queryClient.setQueryData<string[]>(
        ['stadium-favorites'],
        currentlyFavorite ? prev.filter((sid) => sid !== id) : [...prev, id],
      );
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(['stadium-favorites'], context.prev);
      toast.error('즐겨찾기를 변경하지 못했습니다. 다시 시도해 주세요.');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['stadium-favorites'] }),
  });

  return (
    <button
      type="button"
      onClick={() => favoriteMutation.mutate({ id: stadiumId, currentlyFavorite: isFavorite })}
      disabled={favoriteMutation.isPending}
      className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
      aria-label={isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
    >
      <HeartIcon
        className={isFavorite ? 'fill-red-400 text-red-400' : 'text-gray-400 dark:text-white/60'}
        width={18}
        height={18}
      />
    </button>
  );
}
