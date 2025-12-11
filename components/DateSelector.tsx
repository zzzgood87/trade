'use client';

import { useState, useEffect } from 'react';

interface DateSelectorProps {
    onDateChange: (startDate: string, endDate: string) => void;
}

export default function DateSelector({ onDateChange }: DateSelectorProps) {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // 날짜 포맷팅 (YYYY-MM-DD)
    const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const handlePreset = (days: number) => {
        const end = new Date();
        const start = new Date();

        if (days === 0) {
            // 오늘
        } else if (days === 1) {
            // 어제
            start.setDate(end.getDate() - 1);
            end.setDate(end.getDate() - 1);
        } else {
            // 최근 N일
            start.setDate(end.getDate() - days);
        }

        const sStr = formatDate(start);
        const eStr = formatDate(end);

        setStartDate(sStr);
        setEndDate(eStr);
        onDateChange(sStr, eStr);
    };

    const handleCustomChange = (type: 'start' | 'end', value: string) => {
        if (type === 'start') {
            setStartDate(value);
            if (endDate && value > endDate) {
                // 시작일이 종료일보다 늦으면 종료일 초기화 혹은 경고? 일단 둠
            }
            onDateChange(value, endDate);
        } else {
            setEndDate(value);
            onDateChange(startDate, value);
        }
    };

    // 초기값: 오늘
    useEffect(() => {
        handlePreset(0);
    }, []);

    return (
        <div className="flex flex-col gap-2">
            <div className="flex gap-1">
                <button onClick={() => handlePreset(0)} className="px-2 py-1 text-xs border rounded hover:bg-gray-100">오늘</button>
                <button onClick={() => handlePreset(1)} className="px-2 py-1 text-xs border rounded hover:bg-gray-100">어제</button>
                <button onClick={() => handlePreset(7)} className="px-2 py-1 text-xs border rounded hover:bg-gray-100">1주일</button>
                <button onClick={() => handlePreset(30)} className="px-2 py-1 text-xs border rounded hover:bg-gray-100">1달</button>
            </div>
            <div className="flex gap-2 items-center">
                <input
                    type="date"
                    value={startDate}
                    onChange={(e) => handleCustomChange('start', e.target.value)}
                    className="border rounded px-2 py-1 text-xs"
                />
                <span className="text-gray-400">~</span>
                <input
                    type="date"
                    value={endDate}
                    onChange={(e) => handleCustomChange('end', e.target.value)}
                    className="border rounded px-2 py-1 text-xs"
                />
            </div>
        </div>
    );
}
