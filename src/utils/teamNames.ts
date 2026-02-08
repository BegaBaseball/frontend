// Shared Team Name Mapping Utility
// Converts team codes (e.g., "OB") to Korean team names (e.g., "두산")

export const teamNameMap: { [key: string]: string } = {
    // Standard 2-letter codes
    'OB': '두산',
    'HT': 'KIA',
    'LT': '롯데',
    'NC': 'NC',
    'SS': '삼성',
    'WO': '키움',
    'SSG': 'SSG',
    'SK': 'SSG',
    'HH': '한화',
    'LG': 'LG',
    'KT': 'KT',
    // English names (for flexibility)
    'Doosan': '두산',
    'Lotte': '롯데',
    'Samsung': '삼성',
    'Kiwoom': '키움',
    'Hanwha': '한화',
    'Kia': 'KIA',
    'KIA': 'KIA',
    'LOTTE': '롯데',
    'SAMSUNG': '삼성',
    'DOOSAN': '두산',
    'HANWHA': '한화',
    'KIWOOM': '키움',
};

/**
 * Converts a team code to its Korean display name.
 * @param code - The team code (e.g., "OB", "HT")
 * @returns The Korean team name (e.g., "두산", "KIA")
 */
export const getTeamKoreanName = (code: string): string => {
    return teamNameMap[code] || code;
};
