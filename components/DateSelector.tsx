'use client';

import { useState, useEffect } from 'react';

interface DateSelectorProps {
    onDateChange: (startDate: string, endDate: string) => void;
}

export default function DateSelector({ onDateChange }: DateSelectorProps) {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [activePreset, setActivePreset] = useState<number | null>(0);

    // 날짜 포맷팅 (YYYY-MM-DD)
    const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const handlePreset = (days: number) => {
        setActivePreset(days);
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
        setActivePreset(null);
        if (type === 'start') {
            setStartDate(value);
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

    const presetButtonClass = (days: number) => `
        px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-200
        ${activePreset === days
            ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:border-gray-300'}
    `;

    return (
        <div className="flex flex-col gap-3 w-full md:w-auto">
            <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
                <button onClick={() => handlePreset(0)} className={presetButtonClass(0)}>오늘</button>
                <button onClick={() => handlePreset(1)} className={presetButtonClass(1)}>어제</button>
                <button onClick={() => handlePreset(7)} className={presetButtonClass(7)}>1주일</button>
                <button onClick={() => handlePreset(30)} className={presetButtonClass(30)}>1달</button>
            </div>
            <div className="flex gap-2 items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                <input
                    type="date"
                    value={startDate}
                    onChange={(e) => handleCustomChange('start', e.target.value)}
                    className="bg-white border border-gray-200 rounded px-2 py-1 text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                />
                <span className="text-gray-400 text-xs">~</span>
                <input
                    type="date"
                    value={endDate}
                    onChange={(e) => handleCustomChange('end', e.target.value)}
                    className="bg-white border border-gray-200 rounded px-2 py-1 text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                />
            </div>
        </div>
    );
}
