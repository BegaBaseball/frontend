import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import TeamLogo from '../TeamLogo';

const API_BASE_URL = '/api';

interface MateHistoryContentProps {
  tab: 'all' | 'completed' | 'ongoing';
}

const MateHistoryContent = ({ tab }: MateHistoryContentProps) => {
  const [myParties, setMyParties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyParties = async () => {
      try {
        setLoading(true);
        
        // 1. 현재 사용자 정보
        const userResponse = await fetch(`${API_BASE_URL}/auth/mypage`, {
          credentials: 'include',
        });
        
        if (!userResponse.ok) {
          setLoading(false);
          return;
        }
        
        const userData = await userResponse.json();
        
        const userIdResponse = await fetch(
          `${API_BASE_URL}/users/email-to-id?email=${encodeURIComponent(userData.data.email)}`,
          { credentials: 'include' }
        );
        
        if (!userIdResponse.ok) {
          setLoading(false);
          return;
        }
        
        const userIdData = await userIdResponse.json();
        const currentUserId = userIdData.data || userIdData;

        // 2. 내가 호스트인 파티 목록
        const partiesResponse = await fetch(`${API_BASE_URL}/parties`, {
          credentials: 'include',
        });

        if (!partiesResponse.ok) {
          setLoading(false);
          return;
        }

        const allParties = await partiesResponse.json();

        // 3. 내가 참여한 파티 목록
        const myApplicationResponse = await fetch(`/api/applications/applicant/${currentUserId}`,
          { credentials: 'include' }
        )

        const myApplications = await myApplicationResponse.json();
        const myParticipatingPartyIds = myApplications.map((app: any) => app.partyId);

        // 4. 전체 파티 필터링
        const myPartiesList = allParties.filter((party: any) => {
          const isHost = String(party.hostId) === String(currentUserId);
          const isParticipant = myParticipatingPartyIds.includes(party.id);
          return isHost || isParticipant;
      });

        // 5. 탭별 필터링
        let filtered = myPartiesList;
        if (tab === 'completed') {
          filtered = myPartiesList.filter((p: any) => 
            p.status === 'COMPLETED' || p.status === 'CHECKED_IN'
          );
        } else if (tab === 'ongoing') {
          filtered = myPartiesList.filter((p: any) => 
            p.status === 'PENDING' || p.status === 'MATCHED'
          );
        }

        setMyParties(filtered);
      } catch (error) {
        console.error('메이트 내역 불러오기 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMyParties();
  }, [tab]);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  if (myParties.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">
          {tab === 'completed' && '완료된 메이트 내역이 없습니다'}
          {tab === 'ongoing' && '진행 중인 메이트가 없습니다'}
          {tab === 'all' && '참여한 메이트 내역이 없습니다'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {myParties.map((party) => (
        <Card
          key={party.id}
          className="p-6 cursor-pointer hover:shadow-md transition-shadow"
        >
          <div className="flex items-start gap-4">
            <TeamLogo teamId={party.teamId} size="lg" />
            
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 style={{ color: '#2d5f4f', fontWeight: 700 }}>
                  {party.stadium}
                </h3>
                <span className={`px-3 py-1 rounded-full text-sm ${
                  party.status === 'COMPLETED' || party.status === 'CHECKED_IN'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {party.status === 'COMPLETED' && '완료'}
                  {party.status === 'CHECKED_IN' && '체크인 완료'}
                  {party.status === 'MATCHED' && '매칭 완료'}
                  {party.status === 'PENDING' && '모집 중'}
                </span>
              </div>

              <div className="space-y-1 text-sm text-gray-600">
                <p>날짜: {party.gameDate} {party.gameTime}</p>
                <p>좌석: {party.section}</p>
                <p>참여 인원: {party.currentParticipants}/{party.maxParticipants}명</p>
              </div>

              {party.status === 'COMPLETED' && (
                <div className="mt-3 p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-700">
                    경기 관람 완료 · 보증금 환불 완료
                  </p>
                </div>
              )}

              {party.status === 'CHECKED_IN' && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    체크인 완료 · 경기 관람 완료
                  </p>
                </div>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default function MateHistorySection() {
  const [mateHistoryTab, setMateHistoryTab] = useState<'all' | 'completed' | 'ongoing'>('all');

  return (
    <div className="space-y-6">
      <Card className="p-8">
        <h2 className="mb-6" style={{ color: '#2d5f4f', fontWeight: 900 }}>
          참여한 메이트
        </h2>
        
        {/* 탭 버튼 */}
        <div className="flex gap-2 mb-6 border-b">
          <button
            onClick={() => setMateHistoryTab('all')}
            className={`px-4 py-2 -mb-px ${
              mateHistoryTab === 'all'
                ? 'border-b-2 font-bold'
                : 'text-gray-500'
            }`}
            style={{
              borderColor: mateHistoryTab === 'all' ? '#2d5f4f' : 'transparent',
              color: mateHistoryTab === 'all' ? '#2d5f4f' : undefined,
            }}
          >
            전체
          </button>
          <button
            onClick={() => setMateHistoryTab('completed')}
            className={`px-4 py-2 -mb-px ${
              mateHistoryTab === 'completed'
                ? 'border-b-2 font-bold'
                : 'text-gray-500'
            }`}
            style={{
              borderColor: mateHistoryTab === 'completed' ? '#2d5f4f' : 'transparent',
              color: mateHistoryTab === 'completed' ? '#2d5f4f' : undefined,
            }}
          >
            완료됨
          </button>
          <button
            onClick={() => setMateHistoryTab('ongoing')}
            className={`px-4 py-2 -mb-px ${
              mateHistoryTab === 'ongoing'
                ? 'border-b-2 font-bold'
                : 'text-gray-500'
            }`}
            style={{
              borderColor: mateHistoryTab === 'ongoing' ? '#2d5f4f' : 'transparent',
              color: mateHistoryTab === 'ongoing' ? '#2d5f4f' : undefined,
            }}
          >
            진행 중
          </button>
        </div>

        <MateHistoryContent tab={mateHistoryTab} />
      </Card>
    </div>
  );
}