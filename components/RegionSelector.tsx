'use client';

import { useState, useEffect } from 'react';
import { REGION_DATA, RegionNode } from '@/data/regions';

interface RegionSelectorProps {
    onRegionChange: (regionCode: string, dongName: string) => void;
}

export default function RegionSelector({ onRegionChange }: RegionSelectorProps) {
    const [sido, setSido] = useState<RegionNode | null>(null);
    const [sigungu, setSigungu] = useState<RegionNode | null>(null);
    const [dong, setDong] = useState<RegionNode | null>(null);

    // 시/도 변경 핸들러
    const handleSidoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const code = e.target.value;
        const selected = REGION_DATA.find(r => r.code === code) || null;
        setSido(selected);
        setSigungu(null);
        setDong(null);
    };

    // 시/군/구 변경 핸들러
    const handleSigunguChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const code = e.target.value;
        const selected = sido?.children?.find(r => r.code === code) || null;
        setSigungu(selected);
        setDong(null);
    };

    // 읍/면/동 변경 핸들러
    const handleDongChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const code = e.target.value;
        const selected = sigungu?.children?.find(r => r.code === code) || null;
        setDong(selected);

        if (sigungu && selected) {
            // 부모 컴포넌트에 알림 (시군구코드, 동이름)
            onRegionChange(sigungu.code, selected.name);
        }
    };

    return (
        <div className="flex gap-2 items-center">
            {/* 시/도 */}
            <select
                className="border rounded px-3 py-2 text-sm min-w-[100px]"
                value={sido?.code || ''}
                onChange={handleSidoChange}
            >
                <option value="">시/도 선택</option>
                {REGION_DATA.map(r => (
                    <option key={r.code} value={r.code}>{r.name}</option>
                ))}
            </select>

            {/* 시/군/구 */}
            <select
                className="border rounded px-3 py-2 text-sm min-w-[120px]"
                value={sigungu?.code || ''}
                onChange={handleSigunguChange}
                disabled={!sido}
            >
                <option value="">시/군/구 선택</option>
                {sido?.children?.map(r => (
                    <option key={r.code} value={r.code}>{r.name}</option>
                ))}
            </select>

            {/* 읍/면/동 */}
            <select
                className="border rounded px-3 py-2 text-sm min-w-[100px]"
                value={dong?.code || ''}
                onChange={handleDongChange}
                disabled={!sigungu}
            >
                <option value="">읍/면/동 선택</option>
                {sigungu?.children?.map(r => (
                    <option key={r.code} value={r.code}>{r.name}</option>
                ))}
            </select>
        </div>
    );
}
