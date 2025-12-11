import { NextResponse } from 'next/server';
import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import { MatchResult, TradeData } from '@/types';

// XML Parser 설정
const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_"
});

// 강남구 법정동 코드 매핑 (데모용)
const GANGNAM_DONG_CODES: { [key: string]: string } = {
    "개포동": "10300", "논현동": "10800", "대치동": "10600", "도곡동": "11800",
    "삼성동": "10500", "세곡동": "11100", "수서동": "11500", "신사동": "10700",
    "압구정동": "11000", "역삼동": "10100", "율현동": "11300", "일원동": "11400",
    "자곡동": "11200", "청담동": "10400"
};

// 건축물대장 API 호출 함수
async function fetchBuildingLedger(sigunguCd: string, bjdongCd: string, bun: string, ji: string) {
    const url = `http://apis.data.go.kr/1613000/BldRgstService_v2/getBrTitleInfo`;
    try {
        const response = await axios.get(url, {
            params: {
                serviceKey: process.env.NEXT_PUBLIC_API_KEY_MOLIT, // 여기서는 axios가 인코딩하도록 둠 (일반적으로 디코딩된 키 사용 권장되나, 상황에 따라 다름)
                sigunguCd: sigunguCd,
                bjdongCd: bjdongCd,
                bun: bun.padStart(4, '0'),
                ji: ji.padStart(4, '0'),
                numOfRows: 10,
            }
        });
        const parsed = parser.parse(response.data);
        if (parsed.response?.body?.items?.item) {
            let items = parsed.response.body.items.item;
            return Array.isArray(items) ? items : [items];
        }
        return [];
    } catch (e) {
        console.error("Building Ledger API Error", e);
        return [];
    }
}

export async function POST(request: Request) {
    try {
        const { regionCode, ymd } = await request.json();

        if (!regionCode || !ymd) {
            return NextResponse.json({ success: false, error: 'Region Code and YMD are required' }, { status: 400 });
        }

        // 1. 실거래가 API 호출
        // Axios는 params에 객체를 전달하면 기본적으로 인코딩을 수행합니다.
        // 공공데이터포털 키가 이미 인코딩된 상태라면, 이중 인코딩을 방지하기 위해
        // 서비스 키를 URL에 직접 붙이거나, 인터셉터를 사용해야 합니다.

        const RAW_SERVICE_KEY = process.env.NEXT_PUBLIC_API_KEY_MOLIT || '';
        // 주의: 사용자가 제공한 키가 이미 인코딩된 값(%2F...)이라면 그대로 사용해야 합니다.
        // 따라서 decodeURIComponent를 사용하지 않고 원본 값을 쿼리 스트링에 넣습니다.

        const url = `http://openapi.molit.go.kr/OpenAPI_ToolInstallPackage/service/rest/RTMSOBJSvc/getRTMSDataSvcNrgTrade?serviceKey=${RAW_SERVICE_KEY}&LAWD_CD=${regionCode}&DEAL_YMD=${ymd}`;

        console.log(`Fetching trade data from: ${url}`);

        const response = await axios.get(url);

        const parsedData = parser.parse(response.data);

        if (!parsedData.response?.body?.items) {
            return NextResponse.json({ success: true, data: [] });
        }

        let items = parsedData.response.body.items.item;
        if (!Array.isArray(items)) items = [items];

        // 2. 매칭 및 검증 로직
        const results: MatchResult[] = await Promise.all(items.map(async (item: any, idx: number) => {
            const trade: TradeData = {
                dealAmount: item['거래금액']?.trim() || '0',
                dealYear: item['년']?.toString(),
                dealMonth: item['월']?.toString().padStart(2, '0'),
                dealDay: item['일']?.toString().padStart(2, '0'),
                dong: item['법정동']?.trim(),
                landArea: parseFloat(item['대지면적'] || '0'),
                buildArea: parseFloat(item['연면적'] || '0'),
                jibun: item['지번']?.trim(),
                buildingUse: item['건물주용도'],
                jimok: item['지목'],
                zoning: item['용도지역'],
                constructionYear: item['건축년도']?.toString()
            };

            let matchedAddress: string[] = [];
            let status: 'exact' | 'multiple' | 'none' = 'none';
            let similarity = { land: false, building: false, zoning: true };

            // 지번 파싱 (예: "123-45" -> bun: 123, ji: 45)
            let bun = '', ji = '0';
            if (trade.jibun) {
                const parts = trade.jibun.split('-');
                bun = parts[0];
                ji = parts[1] || '0';
            }

            // 법정동 코드로 변환 (강남구 예시)
            const bjdongCd = GANGNAM_DONG_CODES[trade.dong];

            if (bjdongCd && bun) {
                // 건축물대장 조회
                const buildings = await fetchBuildingLedger(regionCode, bjdongCd, bun, ji);

                if (buildings.length > 0) {
                    // 가장 유사한 건물 찾기
                    const match = buildings.find((b: any) => {
                        // 대지면적 비교 (오차 범위 1% 내외 허용 등 로직 가능)
                        const bLand = parseFloat(b['platArea']);
                        const bBuild = parseFloat(b['totArea']);

                        // 간단한 일치 여부 확인
                        const landMatch = Math.abs(bLand - trade.landArea) < 1.0; // 1제곱미터 오차
                        const buildMatch = Math.abs(bBuild - trade.buildArea) < 10.0; // 10제곱미터 오차 (연면적은 차이가 클 수 있음)

                        return landMatch || buildMatch;
                    });

                    if (match) {
                        status = 'exact';
                        matchedAddress = [`${match['platPlc']}`]; // 대장상 주소
                        similarity = {
                            land: Math.abs(parseFloat(match['platArea']) - trade.landArea) < 1.0,
                            building: Math.abs(parseFloat(match['totArea']) - trade.buildArea) < 10.0,
                            zoning: true // 용도지역은 복잡하므로 일단 true
                        };
                    } else {
                        // 건물은 찾았으나 면적이 다름 -> 후보군
                        status = 'multiple';
                        matchedAddress = buildings.map((b: any) => b['platPlc']);
                        similarity = { land: false, building: false, zoning: true };
                    }
                } else {
                    // 대장 정보 없음 -> 실거래가 주소 그대로 사용
                    status = 'none';
                    matchedAddress = [`서울특별시 강남구 ${trade.dong} ${trade.jibun}`];
                }
            } else {
                // 매칭 불가
                matchedAddress = [`서울특별시 강남구 ${trade.dong} ${trade.jibun}`];
            }

            return {
                id: `trade-${idx}`,
                status,
                tradeData: trade,
                matchedAddress,
                similarity
            };
        }));

        return NextResponse.json({ success: true, data: results });

    } catch (error) {
        console.error("Search API Error:", error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}