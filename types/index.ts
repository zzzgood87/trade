export interface TradeData {
    dealAmount: string;
    dealYear: string;
    dealMonth: string;
    dealDay: string;
    dong: string;
    landArea: number;
    buildArea: number;
    jibun: string;
    buildingUse?: string;
    jimok?: string;
    zoning?: string;
    floor?: number;
    constructionYear?: string;
}

export interface MatchResult {
    id: string;
    status: 'exact' | 'multiple' | 'none';
    tradeData: TradeData;
    matchedAddress: string[];
    similarity: {
        land: boolean;
        building: boolean;
        zoning?: boolean;
    };
}