'use client';

import { useState } from 'react';
import MapViewer from '@/components/MapViewer';
import RegionSelector from '@/components/RegionSelector';
import DateSelector from '@/components/DateSelector';
import { MatchResult } from '@/types';

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<MatchResult[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [isMobileMapOpen, setIsMobileMapOpen] = useState(false); // 모바일에서 지도 보기 토글

  // 검색 파라미터 상태
  const [regionCode, setRegionCode] = useState('11680'); // 강남구 기본값
  const [searchDate, setSearchDate] = useState({ start: '', end: '' });

  const handleSearch = async () => {
    if (!searchDate.start || !searchDate.end) {
      alert('날짜를 선택해주세요.');
      return;
    }

    setLoading(true);
    setResults([]);
    setSelectedAddress('');
    setIsMobileMapOpen(false); // 검색 시 리스트 보기로 전환

    try {
      // 1. 기간 내의 모든 'YYYYMM' 추출
      const start = new Date(searchDate.start);
      const end = new Date(searchDate.end);
      const months = new Set<string>();

      let current = new Date(start);
      while (current <= end) {
        const yyyy = current.getFullYear();
        const mm = String(current.getMonth() + 1).padStart(2, '0');
        months.add(`${yyyy}${mm}`);
        current.setMonth(current.getMonth() + 1);
        current.setDate(1);
      }
      const endYyyy = end.getFullYear();
      const endMm = String(end.getMonth() + 1).padStart(2, '0');
      months.add(`${endYyyy}${endMm}`);

      // 2. API 호출
      const promises = Array.from(months).map(ymd =>
        fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ regionCode, ymd }),
        }).then(res => res.json())
      );

      const responses = await Promise.all(promises);

      let allResults: MatchResult[] = [];
      responses.forEach(json => {
        if (json.success && json.data) {
          allResults = [...allResults, ...json.data];
        }
      });

      // 날짜 필터링
      const filtered = allResults.filter(item => {
        const dealDate = `${item.tradeData.dealYear}-${item.tradeData.dealMonth}-${item.tradeData.dealDay}`;
        return dealDate >= searchDate.start && dealDate <= searchDate.end;
      });

      // 최신순 정렬
      filtered.sort((a, b) => {
        const dateA = `${a.tradeData.dealYear}${a.tradeData.dealMonth}${a.tradeData.dealDay}`;
        const dateB = `${b.tradeData.dealYear}${b.tradeData.dealMonth}${b.tradeData.dealDay}`;
        return dateB.localeCompare(dateA);
      });

      setResults(filtered);

    } catch (error) {
      console.error(error);
      alert('데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex flex-col h-screen overflow-hidden bg-gray-50">
      {/* 1. Header Area */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between px-4 md:px-6 py-4 bg-white border-b shadow-sm z-20 gap-4">
        <div className="flex justify-between w-full md:w-auto items-center">
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            🕵️‍♂️ 부동산 탐정 <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded">Beta</span>
          </h1>
          {/* 모바일용 지도 토글 버튼 (결과가 있을 때만 표시) */}
          {results.length > 0 && (
            <button
              onClick={() => setIsMobileMapOpen(!isMobileMapOpen)}
              className="md:hidden text-sm px-3 py-1.5 bg-gray-100 rounded-lg font-medium text-gray-600"
            >
              {isMobileMapOpen ? '목록 보기' : '지도 보기'}
            </button>
          )}
        </div>

        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto items-start md:items-center">
          <RegionSelector onRegionChange={(code, dong) => {
            setRegionCode(code);
          }} />

          <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
            <DateSelector onDateChange={(start, end) => {
              setSearchDate({ start, end });
            }} />

            <button
              onClick={handleSearch} disabled={loading}
              className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl text-sm font-bold transition disabled:bg-gray-400 shadow-lg shadow-blue-200"
            >
              {loading ? '분석 중...' : '조회하기'}
            </button>
          </div>
        </div>
      </header>

      {/* 2. Content Area (Split View) */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* Left: Result List (Mobile: Toggle visibility based on isMobileMapOpen) */}
        <div className={`
            w-full md:w-[400px] md:min-w-[350px] overflow-y-auto bg-white border-r border-gray-200
            ${isMobileMapOpen ? 'hidden md:block' : 'block'}
        `}>
          <div className="p-4 space-y-3 pb-20 md:pb-4">
            <h2 className="text-sm font-bold text-gray-600 mb-2 px-1">분석 결과 {results.length}건</h2>

            {results.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  setSelectedAddress(item.matchedAddress[0]);
                  setIsMobileMapOpen(true); // 모바일에서는 클릭 시 지도로 이동
                }}
                className={`group cursor-pointer p-5 rounded-2xl border transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${selectedAddress === item.matchedAddress[0]
                  ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500 shadow-md'
                  : 'border-gray-100 bg-white hover:border-blue-200'
                  }`}
              >
                {/* Status Badge */}
                <div className="flex justify-between items-center mb-3">
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${item.status === 'exact' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-800'
                    }`}>
                    {item.status === 'exact' ? '✅ 주소확인' : '⚠️ 후보확인'}
                  </span>
                  <span className="text-xs text-gray-400 font-medium">{item.tradeData.dealYear}.{item.tradeData.dealMonth}.{item.tradeData.dealDay}</span>
                </div>

                {/* Price & Address */}
                <div className="mb-3">
                  <div className="text-xl font-extrabold text-gray-900 mb-1">
                    {parseInt(item.tradeData.dealAmount.replace(/,/g, '')) / 10000}억 원
                  </div>
                  <div className="text-xs text-gray-500 flex gap-2">
                    <span className="bg-gray-100 px-2 py-1 rounded-md text-gray-600 font-medium">{item.tradeData.dong}</span>
                    <span className="bg-gray-100 px-2 py-1 rounded-md text-gray-600 font-medium">{item.tradeData.zoning}</span>
                  </div>
                </div>

                {/* Spec Comparison */}
                <div className="text-xs text-gray-500 space-y-1.5 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">대지면적 {item.tradeData.landArea}㎡</span>
                    <span className={`font-bold ${item.similarity.land ? "text-blue-600" : "text-red-500"}`}>
                      {item.similarity.land ? "일치" : "불일치"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">연면적 {item.tradeData.buildArea}㎡</span>
                    <span className={`font-bold ${item.similarity.building ? "text-blue-600" : "text-red-500"}`}>
                      {item.similarity.building ? "일치" : "불일치"}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {results.length === 0 && !loading && (
              <div className="text-center py-20 text-gray-400 flex flex-col items-center gap-2">
                <div className="text-4xl">🔍</div>
                <p>조건을 선택하고 조회 버튼을 눌러주세요</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Map Viewer (Mobile: Hidden unless toggled) */}
        <div className={`
            flex-1 bg-gray-100 p-4
            ${isMobileMapOpen ? 'block' : 'hidden md:block'}
        `}>
          <MapViewer address={selectedAddress} />
        </div>

      </div>
    </main>
  );
}