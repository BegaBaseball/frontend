import { KBO_STADIUMS, SeatCategory, StadiumZone } from './stadiumData';

export const getEstimatedPrice = (stadiumName: string, category: SeatCategory, dateStr: string | Date | undefined): number | null => {
    if (!stadiumName || !category || !dateStr) return null;

    // 1. Find Stadium (Robust matching)
    const stadium = Object.values(KBO_STADIUMS).find(s =>
        s.name === stadiumName ||
        s.id === stadiumName ||
        s.name.includes(stadiumName) ||
        stadiumName.includes(s.name)
    );
    if (!stadium) return null;

    // 2. Find Zones
    const zones = stadium.zones.filter(z => z.category === category);
    if (zones.length === 0) return null;

    // 3. Determine Weekday/Weekend
    const date = new Date(dateStr);
    const day = date.getDay();
    // 0: Sun, 6: Sat.
    // KBO Pricing: Weekday (Mon-Thu), Weekend (Fri-Sun) usually.
    // Let's assume Fri(5), Sat(6), Sun(0) are Weekend for safety, as Fri is often higher.
    const isWeekend = day === 0 || day === 6 || day === 5;

    // 4. Extract Prices
    const prices: number[] = [];
    zones.forEach(z => {
        if (!z.price) return;
        const priceStr = isWeekend ? z.price.weekend : z.price.weekday;
        if (!priceStr) return;

        // Parse "18,000~..." or "18,000" or "18,000원"
        // Remove '원', ',', '~' etc.
        // We want to find the *first* number in the string.
        // Example: "18,000~20,000" -> matches "18,000"
        const matches = priceStr.match(/(\d{1,3}(,\d{3})*)/);
        if (matches) {
            const val = parseInt(matches[0].replace(/,/g, ''), 10);
            if (!isNaN(val)) {
                prices.push(val);
            }
        }
    });

    if (prices.length === 0) return null;

    // Return minimum price logic
    return Math.min(...prices);
};
