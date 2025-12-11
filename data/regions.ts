export interface RegionNode {
    code: string;
    name: string;
    children?: RegionNode[];
}

// 편의상 서울특별시의 주요 구와 동만 우선 추가합니다.
// 실제 서비스에서는 전체 법정동 코드를 DB나 별도 JSON 파일로 관리해야 합니다.
export const REGION_DATA: RegionNode[] = [
    {
        code: "11",
        name: "서울특별시",
        children: [
            {
                code: "11680",
                name: "강남구",
                children: [
                    { code: "10100", name: "역삼동" },
                    { code: "10300", name: "개포동" },
                    { code: "10400", name: "청담동" },
                    { code: "10500", name: "삼성동" },
                    { code: "10600", name: "대치동" },
                    { code: "10700", name: "신사동" },
                    { code: "10800", name: "논현동" },
                    { code: "11000", name: "압구정동" },
                    { code: "11100", name: "세곡동" },
                    { code: "11200", name: "자곡동" },
                    { code: "11300", name: "율현동" },
                    { code: "11400", name: "일원동" },
                    { code: "11500", name: "수서동" },
                    { code: "11800", name: "도곡동" },
                ]
            },
            {
                code: "11650",
                name: "서초구",
                children: [
                    { code: "10800", name: "서초동" },
                    { code: "10600", name: "잠원동" },
                    { code: "10700", name: "반포동" },
                    { code: "10100", name: "방배동" },
                    { code: "10200", name: "양재동" },
                    { code: "10300", name: "우면동" },
                ]
            },
            {
                code: "11440",
                name: "마포구",
                children: [
                    { code: "10100", name: "아현동" },
                    { code: "10200", name: "공덕동" },
                    { code: "10500", name: "용강동" },
                    { code: "12000", name: "서교동" },
                    { code: "12400", name: "연남동" },
                    { code: "12500", name: "성산동" },
                    { code: "12700", name: "상암동" },
                ]
            },
            {
                code: "11410",
                name: "서대문구",
                children: [
                    { code: "11100", name: "연희동" },
                    { code: "11700", name: "북아현동" },
                ]
            }
        ]
    },
    {
        code: "41",
        name: "경기도",
        children: [
            {
                code: "41135",
                name: "성남시 분당구",
                children: [
                    { code: "10100", name: "분당동" },
                    { code: "10200", name: "수내동" },
                    { code: "10300", name: "정자동" },
                    { code: "10700", name: "야탑동" },
                    { code: "10900", name: "판교동" },
                ]
            }
        ]
    }
];
