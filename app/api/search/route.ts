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
        const { regionCode, ymd } = await request.json();

        if (!regionCode || !ymd) {
            return NextResponse.json({ success: false, error: 'Region Code and YMD are required' }, { status: 400 });
        }

        const RAW_SERVICE_KEY = process.env.NEXT_PUBLIC_API_KEY_MOLIT || '';
        const url = `http://openapi.molit.go.kr/OpenAPI_ToolInstallPackage/service/rest/RTMSOBJSvc/getRTMSDataSvcNrgTrade?serviceKey=${RAW_SERVICE_KEY}&LAWD_CD=${regionCode}&DEAL_YMD=${ymd}`;

        console.log(`Fetching trade data from: ${url}`);

        const response = await axios.get(url);

        // Debugging logs
        console.log("API Response Status:", response.status);
        console.log("API Response Data (Preview):", typeof response.data === 'string' ? response.data.substring(0, 200) : "Not string");

        const parsedData = parser.parse(response.data);

        // Check for API Error Response
        if (parsedData.response?.header?.resultCode && parsedData.response?.header?.resultCode !== '00') {
            console.error("API Error Result Code:", parsedData.response?.header?.resultCode, parsedData.response?.header?.resultMsg);
            // Return empty data instead of error to prevent 500 on frontend, or handle gracefully
            return NextResponse.json({ success: true, data: [] });
        }

        if (!parsedData.response?.body?.items) {
            console.log("No items found in response body");
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
                        const bBuild = parseFloat(b['totArea']);
                        const landMatch = Math.abs(bLand - trade.landArea) < 1.0;
                        const buildMatch = Math.abs(bBuild - trade.buildArea) < 10.0;
                        return landMatch || buildMatch;
                    });

                    if (match) {
                        status = 'exact';
                        matchedAddress = [`${match['platPlc']}`];
                        similarity = {
                            land: Math.abs(parseFloat(match['platArea']) - trade.landArea) < 1.0,
                            building: Math.abs(parseFloat(match['totArea']) - trade.buildArea) < 10.0,
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
        }));

        return NextResponse.json({ success: true, data: results });

    } catch (error) {
        console.error("Search API Error:", error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}