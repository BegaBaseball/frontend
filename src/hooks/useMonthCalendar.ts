import { useMemo } from 'react';

interface CalendarDay {
    dayNumber: number;
    isValidDay: boolean;
    dateString: string;
}

export function useMonthCalendar(currentMonth: Date) {
    const calendarDays = useMemo(() => {
        const firstDay = new Date(
            currentMonth.getFullYear(),
            currentMonth.getMonth(),
            1
        ).getDay();
        
        const daysInMonth = new Date(
            currentMonth.getFullYear(),
            currentMonth.getMonth() + 1,
            0
        ).getDate();

        const days: CalendarDay[] = [];

        for(let i=0; i<35; i++) {
            const dayNumber = i - firstDay + 1;
            const isValidDay = dayNumber>0 && dayNumber<=daysInMonth;
            const dateString = isValidDay
                ? `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`
                : '';
            
            days.push({
                dayNumber,
                isValidDay,
                dateString,
            });
        }

        return days;
    }, [currentMonth]);

    const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

    return {
        calendarDays,
        weekDays,
    };
}