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
                serviceKey: process.env.NEXT_PUBLIC_API_KEY_MOLIT,
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
        // 1. 요청 파싱 안전장치
        let body;
        try {
            body = await request.json();
        } catch (e) {
            return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
        }

        const { regionCode, ymd, propertyType = 'APT' } = body; // Default to APT

        if (!regionCode || !ymd) {
            return NextResponse.json({ success: false, error: 'Region Code and YMD are required' }, { status: 400 });
        }

        const RAW_SERVICE_KEY = process.env.NEXT_PUBLIC_API_KEY_MOLIT || '';

        let url = '';
        if (propertyType === 'APT') {
            url = `http://openapi.molit.go.kr/OpenAPI_ToolInstallPackage/service/rest/RTMSOBJSvc/getRTMSDataSvcAptTradeDev?serviceKey=${RAW_SERVICE_KEY}&LAWD_CD=${regionCode}&DEAL_YMD=${ymd}`;
        } else if (propertyType === 'OFFICE') {
            url = `http://openapi.molit.go.kr/OpenAPI_ToolInstallPackage/service/rest/RTMSOBJSvc/getRTMSDataSvcNrgTrade?serviceKey=${RAW_SERVICE_KEY}&LAWD_CD=${regionCode}&DEAL_YMD=${ymd}`;
        } else if (propertyType === 'VILLA') {
            url = `http://openapi.molit.go.kr/OpenAPI_ToolInstallPackage/service/rest/RTMSOBJSvc/getRTMSDataSvcRHTrade?serviceKey=${RAW_SERVICE_KEY}&LAWD_CD=${regionCode}&DEAL_YMD=${ymd}`;
        } else {
            url = `http://openapi.molit.go.kr/OpenAPI_ToolInstallPackage/service/rest/RTMSOBJSvc/getRTMSDataSvcAptTradeDev?serviceKey=${RAW_SERVICE_KEY}&LAWD_CD=${regionCode}&DEAL_YMD=${ymd}`;
        }

        console.log(`Fetching trade data from: ${url} (Type: ${propertyType})`);

        let response;
        try {
            response = await axios.get(url, { timeout: 10000 }); // 10초 타임아웃
        } catch (axiosError: any) {
            console.error("Axios Error:", axiosError.message);
            return NextResponse.json({ success: false, error: `API Connection Failed: ${axiosError.message}` }, { status: 500 });
        }

        console.log("API Response Status:", response.status);

        let parsedData;
        try {
            parsedData = parser.parse(response.data);
        } catch (parseError) {
            console.error("XML Parse Error", parseError);
            return NextResponse.json({ success: false, error: 'XML Parse Error' }, { status: 500 });
        }

        // Check for API Error Response
        if (parsedData.response?.header?.resultCode && parsedData.response?.header?.resultCode !== '00') {
            const resultMsg = parsedData.response?.header?.resultMsg;
            const resultCode = parsedData.response?.header?.resultCode;
            console.error("API Error Result Code:", resultCode, resultMsg);
            // 에러 메시지를 클라이언트에 전달
            return NextResponse.json({ success: false, error: `API Error (${resultCode}): ${resultMsg}` }, { status: 200 });
        }

        if (!parsedData.response?.body?.items) {
            console.log("No items found in response body");
            return NextResponse.json({ success: true, data: [] });
        }

        let items = parsedData.response.body.items.item;
        if (!Array.isArray(items)) items = [items];

        // 2. 매칭 및 검증 로직
        const results: MatchResult[] = await Promise.all(items.map(async (item: any, idx: number) => {
            try {
                // 아파트/상업용/연립다세대 필드 매핑 차이 처리
                const dong = item['법정동']?.trim();
                const jibun = item['지번']?.trim();

                // 아파트는 '아파트', 상업용은 '건물명', 연립은 '연립다세대' 등 필드명이 다를 수 있음
                // 공통 필드 위주로 매핑
                const trade: TradeData = {
                    dealAmount: item['거래금액']?.trim() || '0',
                    dealYear: item['년']?.toString(),
                    dealMonth: item['월']?.toString().padStart(2, '0'),
                    dealDay: item['일']?.toString().padStart(2, '0'),
                    dong: dong,
                    // 아파트는 대지면적이 없을 수 있음 -> 전용면적을 buildArea로 매핑
                    landArea: parseFloat(item['대지면적'] || item['대지권면적'] || '0'),
                    buildArea: parseFloat(item['연면적'] || item['전용면적'] || '0'),
                    jibun: jibun,
                    buildingUse: item['건물주용도'] || item['아파트'] || item['연립다세대'], // 용도 혹은 건물명
                    jimok: item['지목'],
                    zoning: item['용도지역'],
                    constructionYear: item['건축년도']?.toString()
                };

                let matchedAddress: string[] = [];
                let status: 'exact' | 'multiple' | 'none' = 'none';
                let similarity = { land: false, building: false, zoning: true };

                let bun = '', ji = '0';
                if (trade.jibun) {
                    const parts = trade.jibun.split('-');
                    bun = parts[0];
                    ji = parts[1] || '0';
                }

                const bjdongCd = GANGNAM_DONG_CODES[trade.dong];

                if (bjdongCd && bun) {
                    const buildings = await fetchBuildingLedger(regionCode, bjdongCd, bun, ji);

                    if (buildings.length > 0) {
                        const match = buildings.find((b: any) => {
                            const bLand = parseFloat(b['platArea']);
                            const bBuild = parseFloat(b['totArea']); // 연면적
                            const bExcl = parseFloat(b['archArea']); // 건축면적? 전용면적은 대장에 따라 다름 (totArea가 연면적)

                            // 아파트의 경우 전용면적 비교가 중요하지만, 건축물대장 표제부(TitleInfo)에는 전용면적 상세가 없을 수 있음 (전유부 필요)
                            // 일단 표제부 연면적 vs 거래 연면적(전용) 비교는 오차가 클 수 있음.
                            // 데모용으로 간단한 로직 유지하되, 오차 범위 완화

                            const landMatch = Math.abs(bLand - trade.landArea) < 1.0;
                            const buildMatch = Math.abs(bBuild - trade.buildArea) < 30.0; // 오차 범위 30으로 완화 (공용면적 포함 여부 등 차이)
                            return landMatch || buildMatch;
                        });

                        if (match) {
                            status = 'exact';
                            matchedAddress = [`${match['platPlc']}`];
                            similarity = {
                                land: Math.abs(parseFloat(match['platArea']) - trade.landArea) < 1.0,
                                building: Math.abs(parseFloat(match['totArea']) - trade.buildArea) < 30.0,
                                zoning: true
                            };
                        } else {
                            status = 'multiple';
                            matchedAddress = buildings.map((b: any) => b['platPlc']);
                            similarity = { land: false, building: false, zoning: true };
                        }
                    } else {
                        status = 'none';
                        matchedAddress = [`서울특별시 강남구 ${trade.dong} ${trade.jibun}`];
                    }
                } else {
                    matchedAddress = [`서울특별시 강남구 ${trade.dong} ${trade.jibun}`];
                }

                return {
                    id: `trade-${idx}`,
                    status,
                    tradeData: trade,
                    matchedAddress,
                    similarity
                };
            } catch (itemError) {
                console.error("Error processing item", itemError);
                return null; // 개별 아이템 에러 시 무시
            }
        }));

        // null 제거
        const validResults = results.filter(r => r !== null) as MatchResult[];

        return NextResponse.json({ success: true, data: validResults });

    } catch (error) {
        console.error("Search API Critical Error:", error);
        // 절대 500을 반환하지 않고 빈 데이터를 반환하여 프론트엔드 크래시 방지
        return NextResponse.json({ success: false, error: 'Internal Server Error Handled' }, { status: 200 });
    }
}