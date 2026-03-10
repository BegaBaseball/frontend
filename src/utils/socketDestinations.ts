export const NOTIFICATION_SOCKET_DESTINATION = '/user/queue/notifications';

export const buildPartySocketDestination = (partyId: string | number) => `/topic/party/${partyId}`;
