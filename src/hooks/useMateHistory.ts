import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchMyParties } from '../api/mate';
import { filterPartiesByTab } from '../utils/mate';
import { MateHistoryTab, MateParty } from '../types/mate';
import { toast } from 'sonner';

export const useMateHistory = (tab: MateHistoryTab) => {
  // ========== Fetch My Parties ==========
  const {
    data: myParties = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['myParties'],
    queryFn: fetchMyParties,
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 30 * 60 * 1000, // 30분
  });

  // ========== Error Handling ==========
  useEffect(() => {
    if (error) {
      toast.error('메이트 내역을 불러오는데 실패했습니다.');
    }
  }, [error]);

  // ========== Filter by Tab ==========
  const filteredParties = filterPartiesByTab(myParties, tab);

  // ========== Empty Messages ==========
  const getEmptyMessage = () => {
    if (tab === 'completed') return '완료된 메이트 내역이 없습니다';
    if (tab === 'ongoing') return '진행 중인 메이트가 없습니다';
    return '참여한 메이트 내역이 없습니다';
  };

  return {
    parties: filteredParties,
    isLoading,
    isEmpty: filteredParties.length === 0,
    emptyMessage: getEmptyMessage(),
  };
};