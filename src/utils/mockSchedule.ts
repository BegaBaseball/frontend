import { TEAMS, STADIUMS } from './constants';

export interface MatchInfo {
    id: string;
    gameTime: string;
    homeTeam: string;
    awayTeam: string;
    stadium: string;
}

// Helper to generate consistent matches based on date
// (Deterministic pseudo-random to make it look real but stable)
// Helper to generate consistent matches based on date
// (Deterministic pseudo-random to make it look real but stable)
export const getMatchesForDate = (dateStr: string): MatchInfo[] => {
    // Simple hash of the date string to select teams
    const hash = dateStr.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

    // Home Team ID -> Stadium Name mapping
    // Using IDs from constants.ts
    const homeStadiumMap: Record<string, string> = {
        'lg': '서울잠실야구장',
        'doosan': '서울잠실야구장',
        'samsung': '대구삼성라이온즈파크',
        'lotte': '사직야구장',
        'kia': '광주-기아 챔피언스필드',
        'ssg': '인천SSG랜더스필드',
        'kiwoom': '고척스카이돔',
        'hanwha': '대전한화생명이글스파크',
        'kt': '수원KT위즈파크',
        'nc': '창원NC파크'
    };

    // Base rotation of teams
    const teamIds = ['lg', 'samsung', 'doosan', 'kia', 'lotte', 'hanwha', 'ssg', 'kt', 'kiwoom', 'nc'];

    // Rotate team array based on hash to create variable matchups
    // This ensures not everyday is just LG vs Samsung
    const rotation = hash % 5;
    const shiftedTeams = [
        ...teamIds.slice(rotation * 2),
        ...teamIds.slice(0, rotation * 2)
    ];

    const matchups = [];
    for (let i = 0; i < 5; i++) {
        matchups.push([shiftedTeams[i * 2], shiftedTeams[i * 2 + 1]]);
    }

    const dayOfWeek = new Date(dateStr).getDay();
    // KBO usually has no games on Mondays
    if (dayOfWeek === 1) return [];

    return matchups.map((pair, idx) => {
        // Swap home/away based on hash + idx to randomize venues
        const isSwap = (hash + idx) % 2 === 0;
        const homeId = isSwap ? pair[1] : pair[0];
        const awayId = isSwap ? pair[0] : pair[1];

        // Determine Stadium strictly from Home Team
        const stadium = homeStadiumMap[homeId] || STADIUMS[0];

        return {
            id: `match-${dateStr}-${idx}`,
            gameTime: dayOfWeek >= 6 ? '17:00' : '18:30', // Weekend 5pm, Weekday 6:30pm
            homeTeam: homeId,
            awayTeam: awayId,
            stadium: stadium
        };
    });
};
