import Navbar from './Navbar';
import grassDecor from 'figma:asset/3aa01761d11828a81213baa8e622fec91540199d.png';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Plus, Users, MapPin, Calendar, Shield, Star, Search, TrendingUp } from 'lucide-react';
import { useNavigationStore } from '../store/navigationStore';
import { useMateStore } from '../store/mateStore';
import TeamLogo, { teamIdToName } from './TeamLogo';
import { Input } from './ui/input';
import { Avatar, AvatarFallback } from './ui/avatar';

export default function Mate() {
  const setCurrentView = useNavigationStore((state) => state.setCurrentView);
  const { parties, setSelectedParty, searchQuery, setSearchQuery } = useMateStore();

  const handlePartyClick = (party: any) => {
    setSelectedParty(party);
    setCurrentView('mateDetail');
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string }> = {
      PENDING: { label: '모집 중', color: '#2d5f4f' },
      MATCHED: { label: '매칭 성공', color: '#059669' },
      FAILED: { label: '매칭 실패', color: '#dc2626' },
      SELLING: { label: '티켓 판매', color: '#ea580c' },
      SOLD: { label: '판매 완료', color: '#6b7280' },
      CHECKED_IN: { label: '체크인 완료', color: '#7c3aed' },
      COMPLETED: { label: '관람 완료', color: '#4b5563' },
    };
    const config = statusConfig[status] || statusConfig.PENDING;
    return (
      <Badge style={{ backgroundColor: config.color }} className="text-white">
        {config.label}
      </Badge>
    );
  };

  const getBadgeIcon = (badge: string) => {
    if (badge === 'verified') return <Shield className="w-4 h-4 text-blue-500" />;
    if (badge === 'trusted') return <Star className="w-4 h-4 text-yellow-500" />;
    return null;
  };

  // 검색 필터링
  const filterParties = (partyList: any[]) => {
    if (!searchQuery.trim()) return partyList;
    
    const query = searchQuery.toLowerCase();
    return partyList.filter(party => {
      const homeTeamName = teamIdToName[party.homeTeam] || party.homeTeam;
      const awayTeamName = teamIdToName[party.awayTeam] || party.awayTeam;
      
      return (
        party.stadium.toLowerCase().includes(query) ||
        homeTeamName.toLowerCase().includes(query) ||
        awayTeamName.toLowerCase().includes(query) ||
        party.section.toLowerCase().includes(query) ||
        party.hostName.toLowerCase().includes(query)
      );
    });
  };

  const renderPartyCard = (party: any) => (
    <Card
      key={party.id}
      className="p-5 hover:shadow-lg transition-shadow cursor-pointer border-2"
      onClick={() => handlePartyClick(party)}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <Avatar className="w-12 h-12">
            <AvatarFallback className="text-white" style={{ backgroundColor: '#2d5f4f' }}>
              {party.hostName.slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-gray-900">{party.hostName}</span>
              {getBadgeIcon(party.hostBadge)}
              <TeamLogo teamId={party.teamId} size="sm" />
            </div>
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <TrendingUp className="w-3 h-3" style={{ color: '#2d5f4f' }} />
              <span>신뢰도 {party.hostRating}</span>
            </div>
          </div>
        </div>
        {getStatusBadge(party.status)}
      </div>

      <div className="space-y-2 mb-3">
        {/* 팀 매치업 - 날짜 위에 */}
        <div className="flex items-center gap-2 mb-1">
          <TeamLogo teamId={party.homeTeam} size="md" />
          <span className="text-sm text-gray-400">VS</span>
          <TeamLogo teamId={party.awayTeam} size="md" />
        </div>
        
        <div className="flex items-center gap-2 text-gray-700">
          <Calendar className="w-4 h-4" style={{ color: '#2d5f4f' }} />
          <span className="text-sm">{party.gameDate} {party.gameTime}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-700">
          <MapPin className="w-4 h-4" style={{ color: '#2d5f4f' }} />
          <span className="text-sm">{party.stadium} • {party.section}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-700">
          <Users className="w-4 h-4" style={{ color: '#2d5f4f' }} />
          <span className="text-sm">
            {party.currentParticipants}/{party.maxParticipants}명
          </span>
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{party.description}</p>

      {party.price && (
        <div className="text-right">
          <span style={{ color: '#2d5f4f' }}>
            {party.price.toLocaleString()}원
          </span>
        </div>
      )}
    </Card>
  );

  const filteredParties = filterParties(parties);
  const pendingParties = filterParties(parties.filter((p) => p.status === 'PENDING'));
  const matchedParties = filterParties(parties.filter((p) => p.status === 'MATCHED'));
  const sellingParties = filterParties(parties.filter((p) => p.status === 'SELLING'));

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar currentPage="mate" />

      {/* Grass decoration at bottom */}
      <img
        src={grassDecor}
        alt=""
        className="fixed bottom-0 left-0 w-full h-24 object-cover object-top z-0 pointer-events-none opacity-30"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 style={{ color: '#2d5f4f' }} className="mb-2">
              직관메이트 찾기
            </h1>
            <p className="text-gray-600">함께 야구를 즐길 메이트를 찾아보세요</p>
          </div>
          <Button
            onClick={() => setCurrentView('mateCreate')}
            className="rounded-full px-6"
            style={{ backgroundColor: '#2d5f4f' }}
          >
            <Plus className="w-5 h-5 mr-2" />
            파티 만들기
          </Button>
        </div>

        {/* Info Card */}
        <Card className="p-4 mb-8 border-2" style={{ backgroundColor: '#f0f7f4', borderColor: '#2d5f4f' }}>
          <div>
            <h3 className="mb-1" style={{ color: '#2d5f4f' }}>직관메이트 이용 가이드</h3>
            <ul className="text-sm space-y-1" style={{ color: '#1f4438' }}>
              <li>• <strong>내가 호스트인 파티:</strong> 신청 관리 → 승인/거절 → 채팅방 소통</li>
              <li>• <strong>참여 신청한 파티:</strong> 승인 대기 → 승인 후 채팅 가능</li>
              <li>• 경기 당일 체크인으로 보증금을 환불받으세요</li>
            </ul>
          </div>
        </Card>

        {/* Search */}
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            type="text"
            placeholder="팀명, 구장으로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 bg-white border-2 border-gray-200 rounded-lg focus:border-[#2d5f4f] transition-colors"
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="all" className="mb-6">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="all">전체</TabsTrigger>
            <TabsTrigger value="recruiting">모집 중</TabsTrigger>
            <TabsTrigger value="matched">매칭 완료</TabsTrigger>
            <TabsTrigger value="selling">티켓 판매</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {filteredParties.length === 0 ? (
              <div className="text-center py-16">
                <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500">
                  {searchQuery ? '검색 결과가 없습니다' : '등록된 파티가 없습니다'}
                </p>
              </div>
            ) : (
              filteredParties.map(renderPartyCard)
            )}
          </TabsContent>

          <TabsContent value="recruiting" className="space-y-4">
            {pendingParties.length === 0 ? (
              <div className="text-center py-16">
                <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500">모집 중인 파티가 없습니다</p>
              </div>
            ) : (
              pendingParties.map(renderPartyCard)
            )}
          </TabsContent>

          <TabsContent value="matched" className="space-y-4">
            {matchedParties.length === 0 ? (
              <div className="text-center py-16">
                <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500">매칭된 파티가 없습니다</p>
              </div>
            ) : (
              matchedParties.map(renderPartyCard)
            )}
          </TabsContent>

          <TabsContent value="selling" className="space-y-4">
            {sellingParties.length === 0 ? (
              <div className="text-center py-16">
                <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500">판매 중인 티켓이 없습니다</p>
              </div>
            ) : (
              sellingParties.map(renderPartyCard)
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
