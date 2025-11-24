// 주간 캘린더 구현 (768px 이하에서 작동)
import { useState } from 'react';

export function useWeekCalendar(initialDate: Date = new Date()) {
    const [currentWeekStart, setCurrentWeekStart] = useState(() => {
        const date = new Date(initialDate);
        const day = date.getDay();
        const diff = date.getDate() - day;
        return new Date(date.setDate(diff));
    });

    // 지난 주 이동
    const goToPrevWeek = () => {
        const newDate = new Date(currentWeekStart);
        newDate.setDate(newDate.getDate() - 7);
        setCurrentWeekStart(newDate);
    };

    // 다음 주 이동
    const goToNextWeek = () => {
        const newDate = new Date(currentWeekStart);
        newDate.setDate(newDate.getDate() + 7);
        setCurrentWeekStart(newDate);
    };

    const getWeekDays = () => {
    return Array.from({ length: 7 }, (_, i) => {
        const date = new Date(currentWeekStart);
        date.setDate(date.getDate() + i);
        return date;
    });
    };

    const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

    return {
        currentWeekStart,
        goToPrevWeek,
        goToNextWeek,
        getWeekDays,
        weekDays,
    };
}