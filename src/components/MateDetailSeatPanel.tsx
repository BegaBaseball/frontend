import { Info, MapPin } from 'lucide-react';

import { KBO_STADIUMS } from '../utils/stadiumData';
import { Button } from './ui/plain-button';
import PlainDialog from './ui/plain-dialog';
import SeatViewGallery from './SeatViewGallery';

interface MateDetailSeatPanelProps {
  open: boolean;
  stadium: string;
  section: string;
  onClose: () => void;
}

const resolveSeatZone = (stadiumName: string, sectionName: string) => {
  const stadium = Object.values(KBO_STADIUMS).find((candidate) => (
    stadiumName.includes(candidate.name) || candidate.name.includes(stadiumName)
  ));
  if (!stadium) {
    return null;
  }

  return stadium.zones.find((zone) => (
    zone.keywords.some((keyword) => sectionName.includes(keyword)) || sectionName.includes(zone.name)
  )) || null;
};

export default function MateDetailSeatPanel({
  open,
  stadium,
  section,
  onClose,
}: MateDetailSeatPanelProps) {
  const currentZone = resolveSeatZone(stadium, section);

  return (
    <PlainDialog
      open={open}
      onClose={onClose}
      title="좌석/구역 보기"
      className="sm:max-w-3xl"
      footer={(
        <Button variant="outline" onClick={onClose}>
          닫기
        </Button>
      )}
    >
      <div className="space-y-4 py-2" data-testid="mate-seat-panel">
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <div className="rounded-xl border border-gray-200/80 bg-gray-50/90 p-4 dark:border-border/70 dark:bg-secondary/70">
            <p className="text-[16px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">좌석 정보</p>
            <p className="mt-2 text-base font-semibold text-gray-900 dark:text-white">{section}</p>
            <div className="mt-2 flex items-center gap-2 text-[16px] text-gray-600 dark:text-gray-300">
              <MapPin className="h-4 w-4 text-primary" />
              <span>{stadium}</span>
            </div>
          </div>
          {currentZone ? (
            <div
              className="inline-flex items-center justify-center rounded-xl px-4 py-3 text-[16px] font-semibold text-white shadow-sm"
              style={{ backgroundColor: currentZone.color || '#4b5563' }}
            >
              {currentZone.name}
            </div>
          ) : null}
        </div>

        {currentZone ? (
          <div className="rounded-xl border border-gray-200/80 bg-gray-50/90 p-4 dark:border-border/70 dark:bg-secondary/70">
            <div className="flex items-center gap-2 text-[16px] font-semibold text-gray-900 dark:text-white">
              <Info className="h-4 w-4 text-primary" />
              구역 설명
            </div>
            <p className="mt-2 text-[16px] text-gray-600 dark:text-gray-300">{currentZone.description}</p>
            {currentZone.price ? (
              <div className="mt-3 grid gap-2 text-[16px] text-gray-600 dark:text-gray-300 sm:grid-cols-2">
                <div className="flex justify-between rounded-lg border border-gray-200/70 bg-white/70 px-3 py-2 dark:border-border/60 dark:bg-background/30">
                  <span>주중</span>
                  <span>{currentZone.price.weekday}</span>
                </div>
                <div className="flex justify-between rounded-lg border border-gray-200/70 bg-white/70 px-3 py-2 dark:border-border/60 dark:bg-background/30">
                  <span>주말</span>
                  <span>{currentZone.price.weekend}</span>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="rounded-xl border border-gray-200/80 bg-white p-4 dark:border-border/70 dark:bg-card/90">
          <h3 className="mb-4 flex items-center gap-2 text-[16px] font-semibold text-gray-900 dark:text-white">
            <MapPin className="h-4 w-4 text-primary" />
            좌석 시야
          </h3>
          <SeatViewGallery stadium={stadium} section={section} />
        </div>
      </div>
    </PlainDialog>
  );
}
