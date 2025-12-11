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

    try {
      // 1. 기간 내의 모든 'YYYYMM' 추출
      const start = new Date(searchDate.start);
      const end = new Date(searchDate.end);
      const months = new Set<string>();

      let current = new Date(start);
      // 날짜 루프: 시작일부터 종료일까지 월 단위로 추가
      while (current <= end) {
        const yyyy = current.getFullYear();
        const mm = String(current.getMonth() + 1).padStart(2, '0');
        months.add(`${yyyy}${mm}`);
        current.setMonth(current.getMonth() + 1);
        current.setDate(1); // 다음 달 1일로 설정하여 루프 진행
      }
      // 종료일이 속한 달도 확실히 포함
      const endYyyy = end.getFullYear();
      const endMm = String(end.getMonth() + 1).padStart(2, '0');
      months.add(`${endYyyy}${endMm}`);

      // 2. 각 월별로 API 호출 (병렬 처리)
      const promises = Array.from(months).map(ymd =>
        fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ regionCode, ymd }),
        }).then(res => res.json())
      );

      const responses = await Promise.all(promises);

      // 3. 결과 합치기 및 날짜 필터링
      let allResults: MatchResult[] = [];
      responses.forEach(json => {
        if (json.success && json.data) {
          allResults = [...allResults, ...json.data];
        }
      });

      // 날짜 필터링 (YYYY-MM-DD 문자열 비교)
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
    <main className="flex flex-col h-screen overflow-hidden">
      {/* 1. Header Area */}
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b shadow-sm z-20">
        <div>
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            🕵️‍♂️ 부동산 탐정 <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded">Beta</span>
          </h1>
        </div>
        <div className="flex gap-4 items-center">
          <RegionSelector onRegionChange={(code, dong) => {
            setRegionCode(code);
            console.log("Selected:", code, dong);
          }} />
          <DateSelector onDateChange={(start, end) => {
            setSearchDate({ start, end });
          }} />
          <button
            onClick={handleSearch} disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition disabled:bg-gray-400 h-fit"
          >
            {loading ? '분석 중...' : '조회하기'}
          </button>
        </div>
      </header>

      {/* 2. Content Area (Split View) */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left: Result List */}
        <div className="w-[400px] min-w-[350px] overflow-y-auto bg-white border-r border-gray-200">
          <div className="p-4 space-y-3">
            <h2 className="text-sm font-bold text-gray-600 mb-2">분석 결과 {results.length}건</h2>

            {results.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedAddress(item.matchedAddress[0])}
                className={`group cursor-pointer p-4 rounded-xl border transition-all duration-200 hover:shadow-md ${selectedAddress === item.matchedAddress[0]
                  ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                  : 'border-gray-200 bg-white'
                  }`}
              >
                {/* Status Badge */}
                <div className="flex justify-between items-center mb-3">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${item.status === 'exact' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-800'
                    }`}>
                    {item.status === 'exact' ? '✅ 주소확인' : '⚠️ 후보확인'}
                  </span>
                  <span className="text-xs text-gray-400">{item.tradeData.dealYear}.{item.tradeData.dealMonth}.{item.tradeData.dealDay}</span>
                </div>

                {/* Price & Address */}
                <div className="mb-2">
                  <div className="text-lg font-bold text-gray-800">
                    {parseInt(item.tradeData.dealAmount.replace(/,/g, '')) / 10000}억 원
                  </div>
                  <div className="text-xs text-gray-500 mt-1 flex gap-2">
                    <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{item.tradeData.dong}</span>
                    <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{item.tradeData.zoning}</span>
                  </div>
                </div>

                {/* Spec Comparison */}
                <div className="text-xs text-gray-500 space-y-1 bg-gray-50 p-2 rounded">
                  <div className="flex justify-between">
                    <span>대지: {item.tradeData.landArea}㎡</span>
                    <span className={item.similarity.land ? "text-blue-600 font-bold" : "text-red-500"}>
                      {item.similarity.land ? "일치" : "불일치"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>연면: {item.tradeData.buildArea}㎡</span>
                    <span className={item.similarity.building ? "text-blue-600 font-bold" : "text-red-500"}>
                      {item.similarity.building ? "일치" : "불일치"}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {results.length === 0 && !loading && (
              <div className="text-center py-20 text-gray-400">
                <p>데이터 조회 버튼을 눌러주세요</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Map Viewer */}
        <div className="flex-1 bg-gray-100 p-4">
          <MapViewer address={selectedAddress} />
        </div>

      </div>
    </main>
  );
}