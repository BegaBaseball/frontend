import baseballLogo from 'figma:asset/d8ca714d95aedcc16fe63c80cbc299c6e3858c70.png';
import { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Bell, User, MapPin, Home, Heart, TrendingUp, BookOpen, Utensils, ShoppingBag, ParkingCircle } from 'lucide-react';
import ChatBot from './ChatBot';
import { NavigateHandler } from '../types';

interface StadiumGuideProps {
  onNavigateToLogin: () => void;
  onNavigate: NavigateHandler;
}

export default function StadiumGuide({ onNavigateToLogin, onNavigate }: StadiumGuideProps) {
  const [selectedStadium, setSelectedStadium] = useState('잠실야구장');
  const [selectedCategory, setSelectedCategory] = useState<'restaurant' | 'store' | 'parking'>('restaurant');

  const stadiums = [
    '잠실야구장',
    '고척스카이돔',
    '수원 KT 위즈 파크',
    '인천 SSG 랜더스필드',
    '대전 한화생명 이글스파크',
    '광주 KIA 챔피언스 필드',
    '대구 삼성 라이온즈파크',
    '창원 NC 파크',
    '부산 사직야구장',
    '서울종합운동장 야구장'
  ];

  const categoryData = {
    restaurant: [
      { name: '야구장 맛집 1', address: '서울 송파구', rating: '4.5' },
      { name: '야구장 맛집 2', address: '서울 송파구', rating: '4.3' },
      { name: '야구장 맛집 3', address: '서울 송파구', rating: '4.7' }
    ],
    store: [
      { name: 'GS25 잠실점', address: '서울 송파구', rating: '4.2' },
      { name: 'CU 잠실역점', address: '서울 송파구', rating: '4.1' },
      { name: '세븐일레븐 잠실점', address: '서울 송파구', rating: '4.0' }
    ],
    parking: [
      { name: '잠실야구장 주차장', address: '서울 송파구', rating: '3.8' },
      { name: '롯데월드몰 주차장', address: '서울 송파구', rating: '4.2' },
      { name: '잠실역 공영주차장', address: '서울 송파구', rating: '3.9' }
    ]
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <button onClick={() => onNavigate('home')} className="flex items-center gap-3">
              <img src={baseballLogo} alt="Baseball" className="w-10 h-10" />
              <div>
                <h1 className="tracking-wider" style={{ fontWeight: 900, color: '#2d5f4f' }}>BEGA</h1>
                <p className="text-xs" style={{ color: '#2d5f4f' }}>BASEBALL GUIDE</p>
              </div>
            </button>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <button 
                onClick={() => onNavigate('home')} 
                className="text-gray-700 hover:opacity-70"
              >
                홈
              </button>
              <button 
                onClick={() => onNavigate('cheer')}
                className="text-gray-700 hover:opacity-70"
              >
                응원
              </button>
              <button 
                onClick={() => onNavigate('stadium')} 
                className="hover:opacity-70"
                style={{ color: '#2d5f4f', fontWeight: 700 }}
              >
                구장
              </button>
              <button 
                onClick={() => onNavigate('prediction')}
                className="text-gray-700 hover:opacity-70"
              >
                예측
              </button>
              <button 
                onClick={() => onNavigate('diary')}
                className="text-gray-700 hover:opacity-70"
              >
                다이어리
              </button>
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-4">
              <button className="text-gray-600 hover:text-gray-900 relative">
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <button 
                onClick={() => onNavigate('mypage')}
                className="text-gray-600 hover:text-gray-900"
              >
                <User className="w-5 h-5" />
              </button>
              <Button
                onClick={onNavigateToLogin}
                className="rounded-full px-6"
                style={{ backgroundColor: '#2d5f4f' }}
              >
                로그인
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Title */}
        <div className="flex items-center gap-3 mb-6">
          <MapPin className="w-7 h-7" style={{ color: '#2d5f4f' }} />
          <h2 style={{ color: '#2d5f4f', fontWeight: 900 }}>구장 가이드</h2>
        </div>

        {/* Stadium Selector */}
        <div className="mb-6">
          <Select value={selectedStadium} onValueChange={setSelectedStadium}>
            <SelectTrigger 
              className="w-full py-6 bg-white border-2 rounded-2xl"
              style={{ borderColor: '#2d5f4f' }}
            >
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5" style={{ color: '#2d5f4f' }} />
                <SelectValue placeholder="구장을 선택하세요" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {stadiums.map((stadium) => (
                <SelectItem key={stadium} value={stadium}>
                  {stadium}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Map Area */}
        <Card 
          className="mb-6 p-12 flex flex-col items-center justify-center rounded-3xl border-2"
          style={{ 
            backgroundColor: '#e8f5f0',
            borderColor: '#2d5f4f',
            minHeight: '300px'
          }}
        >
          <MapPin className="w-16 h-16 mb-4" style={{ color: '#2d5f4f' }} />
          <h3 style={{ color: '#2d5f4f', fontWeight: 900 }}>구장 위치</h3>
          <p className="text-gray-600 mt-2">{selectedStadium} 주변 지도</p>
          <p className="text-sm text-gray-500 mt-4">* 실제 지도는 추후 연동 예정</p>
        </Card>

        {/* Category Buttons */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <button
            onClick={() => setSelectedCategory('restaurant')}
            className="py-6 rounded-2xl border-2 transition-all flex items-center justify-center gap-2"
            style={{
              backgroundColor: selectedCategory === 'restaurant' ? '#fff5e6' : 'white',
              borderColor: selectedCategory === 'restaurant' ? '#ff9500' : '#e5e7eb',
              color: selectedCategory === 'restaurant' ? '#ff9500' : '#4b5563'
            }}
          >
            <Utensils className="w-5 h-5" />
            <span style={{ fontWeight: selectedCategory === 'restaurant' ? 700 : 400 }}>맛집</span>
          </button>

          <button
            onClick={() => setSelectedCategory('store')}
            className="py-6 rounded-2xl border-2 transition-all flex items-center justify-center gap-2"
            style={{
              backgroundColor: selectedCategory === 'store' ? '#e8f5f0' : 'white',
              borderColor: selectedCategory === 'store' ? '#2d5f4f' : '#e5e7eb',
              color: selectedCategory === 'store' ? '#2d5f4f' : '#4b5563'
            }}
          >
            <ShoppingBag className="w-5 h-5" />
            <span style={{ fontWeight: selectedCategory === 'store' ? 700 : 400 }}>편의점</span>
          </button>

          <button
            onClick={() => setSelectedCategory('parking')}
            className="py-6 rounded-2xl border-2 transition-all flex items-center justify-center gap-2"
            style={{
              backgroundColor: selectedCategory === 'parking' ? '#e8f5f0' : 'white',
              borderColor: selectedCategory === 'parking' ? '#2d5f4f' : '#e5e7eb',
              color: selectedCategory === 'parking' ? '#2d5f4f' : '#4b5563'
            }}
          >
            <ParkingCircle className="w-5 h-5" />
            <span style={{ fontWeight: selectedCategory === 'parking' ? 700 : 400 }}>주차장</span>
          </button>
        </div>

        {/* Results List */}
        <div className="space-y-4">
          {categoryData[selectedCategory].map((item, index) => (
            <Card key={index} className="p-4 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <h4 style={{ fontWeight: 700 }}>{item.name}</h4>
                  <p className="text-sm text-gray-600 mt-1">{item.address}</p>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-yellow-500">★</span>
                  <span style={{ fontWeight: 700 }}>{item.rating}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* ChatBot */}
      <ChatBot />
    </div>
  );
}
