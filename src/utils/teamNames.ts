// Shared Team Name Mapping Utility
// Converts team codes (e.g., "DB") to Korean team names (e.g., "두산")

export const teamNameMap: { [key: string]: string } = {
    // Standard 2-letter codes
    'DB': '두산',
    'KIA': 'KIA',
    'LT': '롯데',
    'NC': 'NC',
    'SS': '삼성',
    'KH': '키움',
    'SSG': 'SSG',
    // Legacy codes (safe fallback)
    'OB': '두산',
    'DO': '두산',
    'HT': 'KIA',
    'WO': '키움',
    'KI': '키움',
    'NX': '키움',
    'SK': 'SSG',
    'HH': '한화',
    'LG': 'LG',
    'KT': 'KT',
    // English names (for flexibility)
    'Doosan': '두산',
    'Lotte': '롯데',
    'Samsung': '삼성',
    'Kiwoom': '키움',
    'Nexen': '키움',
    'Hanwha': '한화',
    'Kia': 'KIA',
    'LOTTE': '롯데',
    'SAMSUNG': '삼성',
    'DOOSAN': '두산',
    'HANWHA': '한화',
    'KIWOOM': '키움',
};

/**
 * Converts a team code to its Korean display name.
 * @param code - The team code (e.g., "DB", "KIA")
 * @returns The Korean team name (e.g., "두산", "KIA")
 */
export const getTeamKoreanName = (code: string): string => {
    return teamNameMap[code] || code;
};
