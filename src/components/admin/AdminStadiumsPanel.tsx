import { Button } from '../ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import type { Place } from '../../api/admin';
import { getStadiumDisplayName } from '../../utils/stadiumDisplay';
import { AdminEditIcon, AdminPlusIcon } from './AdminDetailIcons';
import {
  AdminBadge,
  adminNativeSelectClassName,
} from './AdminPanelPrimitives';
import {
  AdminMapPinIcon,
  AdminTrashIcon,
} from './AdminPanelIcons';

interface StadiumDto {
  stadiumId: string;
  stadiumName: string;
  team: string;
  lat: number;
  lng: number;
  address: string;
  phone: string;
}

interface AdminStadiumsPanelProps {
  stadiumError: string | null;
  selectedStadiumId: string;
  stadiumsLoading: boolean;
  stadiums: StadiumDto[];
  placesLoading: boolean;
  places: Place[];
  setSelectedStadiumId: (stadiumId: string) => void;
  openCreateDialog: () => void;
  openEditDialog: (place: Place) => void;
  setDeletingPlaceId: (placeId: number | null) => void;
}

export function AdminStadiumsPanel({
  stadiumError,
  selectedStadiumId,
  stadiumsLoading,
  stadiums,
  placesLoading,
  places,
  setSelectedStadiumId,
  openCreateDialog,
  openEditDialog,
  setDeletingPlaceId,
}: AdminStadiumsPanelProps) {
  return (
    <>
      {stadiumError && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-caption text-red-300">
          {stadiumError}
        </div>
      )}

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <select
            data-testid="admin-stadium-select-trigger"
            value={selectedStadiumId}
            onChange={(e) => setSelectedStadiumId(e.target.value)}
            disabled={stadiumsLoading}
            className={adminNativeSelectClassName}
          >
            {!selectedStadiumId && (
              <option value="">
                {stadiumsLoading ? '로딩 중...' : '구장을 선택하세요'}
              </option>
            )}
            {stadiums.map((stadium) => (
              <option key={stadium.stadiumId} value={stadium.stadiumId}>
                {getStadiumDisplayName(stadium)}
                {stadium.team ? ` (${stadium.team})` : ''}
              </option>
            ))}
          </select>
        </div>
        <Button
          onClick={openCreateDialog}
          data-testid="admin-stadium-add-place"
          disabled={!selectedStadiumId}
          className="rounded-xl bg-amber-500 text-slate-950 shadow-sm hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500"
        >
          <AdminPlusIcon className="mr-2 h-4 w-4" />
          장소 추가
        </Button>
      </div>

      {placesLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent motion-reduce:animate-none" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-800">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700 bg-slate-800/50 hover:bg-slate-800/50">
                <TableHead className="font-semibold text-slate-400">ID</TableHead>
                <TableHead className="font-semibold text-slate-400">카테고리</TableHead>
                <TableHead className="font-semibold text-slate-400">이름</TableHead>
                <TableHead className="font-semibold text-slate-400">주소</TableHead>
                <TableHead className="font-semibold text-slate-400">전화</TableHead>
                <TableHead className="font-semibold text-slate-400">평점</TableHead>
                <TableHead className="font-semibold text-slate-400">영업시간</TableHead>
                <TableHead className="text-right font-semibold text-slate-400">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {places.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-16 text-center text-slate-500">
                    <AdminMapPinIcon className="mx-auto mb-3 h-12 w-12 opacity-30" />
                    {selectedStadiumId
                      ? '등록된 장소가 없습니다.'
                      : '구장을 먼저 선택하세요.'}
                  </TableCell>
                </TableRow>
              ) : (
                places.map((place) => (
                  <TableRow
                    key={place.id}
                    className="border-slate-800 transition-colors duration-150 hover:bg-slate-800/30"
                  >
                    <TableCell className="font-mono text-caption text-slate-300">
                      {place.id}
                    </TableCell>
                    <TableCell>
                      <AdminBadge className="border-slate-700 bg-slate-800 text-slate-300">
                        {place.category}
                      </AdminBadge>
                    </TableCell>
                    <TableCell className="font-semibold text-slate-200">
                      {place.name}
                    </TableCell>
                    <TableCell className="max-w-[160px] truncate text-caption text-slate-400">
                      {place.address || '-'}
                    </TableCell>
                    <TableCell className="text-caption text-slate-400">
                      {place.phone || '-'}
                    </TableCell>
                    <TableCell>
                      {place.rating != null ? (
                        <span className="inline-flex items-center gap-1 text-caption font-semibold text-amber-400">
                          {place.rating.toFixed(1)}
                          <span className="text-amber-500/60">★</span>
                        </span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-caption text-slate-400">
                      {place.openTime && place.closeTime
                        ? `${place.openTime} ~ ${place.closeTime}`
                        : place.openTime || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          data-testid={`admin-place-edit-${place.id}`}
                          onClick={() => openEditDialog(place)}
                          className="rounded-lg text-slate-400 transition-colors duration-150 hover:bg-amber-500/10 hover:text-amber-300"
                        >
                          <AdminEditIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          data-testid={`admin-place-delete-${place.id}`}
                          onClick={() => setDeletingPlaceId(place.id)}
                          className="rounded-lg text-slate-500 transition-colors duration-150 hover:bg-red-500/10 hover:text-red-400"
                        >
                          <AdminTrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
