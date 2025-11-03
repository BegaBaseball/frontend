import { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { MapPin, Utensils, ShoppingBag, ParkingCircle, Truck } from 'lucide-react';
import ChatBot from './ChatBot';
import Navbar from './Navbar';

export default function StadiumGuide() {
  const [selectedStadium, setSelectedStadium] = useState('잠실야구장');
  const [selectedCategory, setSelectedCategory] = useState<'restaurant' | 'delivery' | 'store' | 'parking'>('restaurant');

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
    delivery: [
      { name: '배달존 A구역', address: '서울 송파구 잠실동', rating: '4.6' },
      { name: '배달존 B구역', address: '서울 송파구 신천동', rating: '4.4' },
      { name: '배달존 C구역', address: '서울 송파구 잠실본동', rating: '4.5' }
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
      {/* Navbar */}
      <Navbar 
        currentPage="stadium" 
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Title */}
        <div className="flex items-center gap-3 mb-6">
          <MapPin className="w-7 h-7" style={{ color: '#2d5f4f' }} />
          <h2 style={{ color: '#2d5f4f', fontWeight: 900 }}>구장 가이드</h2>
        </div>

        {/* 2 Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Stadium Selector & Map */}
          <div className="space-y-6">
            {/* Stadium Selector */}
            <div>
              <h3 className="mb-3" style={{ color: '#2d5f4f' }}>구장 선택</h3>
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
            <div>
              <h3 className="mb-3" style={{ color: '#2d5f4f' }}>구장 위치</h3>
              <Card 
                className="p-12 flex flex-col items-center justify-center rounded-3xl border-2"
                style={{ 
                  backgroundColor: '#e8f5f0',
                  borderColor: '#2d5f4f',
                  minHeight: '500px'
                }}
              >
                <MapPin className="w-16 h-16 mb-4" style={{ color: '#2d5f4f' }} />
                <h4 style={{ color: '#2d5f4f', fontWeight: 700 }}>{selectedStadium}</h4>
                <p className="text-gray-600 mt-2">주변 지도</p>
                <p className="text-sm text-gray-500 mt-4">* 실제 지도는 추후 연동 예정</p>
              </Card>
            </div>
          </div>

          {/* Right Column - Category Filter & Results */}
          <div className="space-y-6">
            {/* Category Buttons */}
            <div>
              <h3 className="mb-3" style={{ color: '#2d5f4f' }}>카테고리</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <button
                  onClick={() => setSelectedCategory('restaurant')}
                  className="py-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2"
                  style={{
                    backgroundColor: selectedCategory === 'restaurant' ? '#fff5e6' : 'white',
                    borderColor: selectedCategory === 'restaurant' ? '#ff9500' : '#e5e7eb',
                    color: selectedCategory === 'restaurant' ? '#ff9500' : '#4b5563'
                  }}
                >
                  <Utensils className="w-6 h-6" />
                  <span className="text-sm" style={{ fontWeight: selectedCategory === 'restaurant' ? 700 : 400 }}>맛집</span>
                </button>

                <button
                  onClick={() => setSelectedCategory('delivery')}
                  className="py-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2"
                  style={{
                    backgroundColor: selectedCategory === 'delivery' ? '#e8f5f0' : 'white',
                    borderColor: selectedCategory === 'delivery' ? '#2d5f4f' : '#e5e7eb',
                    color: selectedCategory === 'delivery' ? '#2d5f4f' : '#4b5563'
                  }}
                >
                  <Truck className="w-6 h-6" />
                  <span className="text-sm" style={{ fontWeight: selectedCategory === 'delivery' ? 700 : 400 }}>배달존</span>
                </button>

                <button
                  onClick={() => setSelectedCategory('store')}
                  className="py-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2"
                  style={{
                    backgroundColor: selectedCategory === 'store' ? '#e8f5f0' : 'white',
                    borderColor: selectedCategory === 'store' ? '#2d5f4f' : '#e5e7eb',
                    color: selectedCategory === 'store' ? '#2d5f4f' : '#4b5563'
                  }}
                >
                  <ShoppingBag className="w-6 h-6" />
                  <span className="text-sm" style={{ fontWeight: selectedCategory === 'store' ? 700 : 400 }}>편의점</span>
                </button>

                <button
                  onClick={() => setSelectedCategory('parking')}
                  className="py-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2"
                  style={{
                    backgroundColor: selectedCategory === 'parking' ? '#e8f5f0' : 'white',
                    borderColor: selectedCategory === 'parking' ? '#2d5f4f' : '#e5e7eb',
                    color: selectedCategory === 'parking' ? '#2d5f4f' : '#4b5563'
                  }}
                >
                  <ParkingCircle className="w-6 h-6" />
                  <span className="text-sm" style={{ fontWeight: selectedCategory === 'parking' ? 700 : 400 }}>주차장</span>
                </button>
              </div>
            </div>

            {/* Results List */}
            <div>
              <h3 className="mb-3" style={{ color: '#2d5f4f' }}>
                {selectedCategory === 'restaurant' ? '맛집' : selectedCategory === 'delivery' ? '배달존' : selectedCategory === 'store' ? '편의점' : '주차장'} 목록
              </h3>
              <div className="space-y-3">
                {categoryData[selectedCategory].map((item, index) => (
                  <Card key={index} className="p-4 hover:shadow-lg transition-shadow cursor-pointer border-2 border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
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
          </div>
        </div>
      </div>

      {/* ChatBot */}
      <ChatBot />
    </div>
  );
}
