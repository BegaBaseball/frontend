import api from './axios';

export interface TicketInfo {
    date: string | null;
    time: string | null;
    stadium: string | null;
    homeTeam: string | null;
    awayTeam: string | null;
    section: string | null;
    row: string | null;
    seat: string | null;
    peopleCount: number | null;
    price: number | null;
    reservationNumber: string | null;
    gameId: number | null;
    verificationToken: string | null;
}

export const analyzeTicket = async (file: File): Promise<TicketInfo> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<TicketInfo>('/tickets/analyze', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
        skipGlobalErrorHandler: true,
    });

    return response.data;
};
