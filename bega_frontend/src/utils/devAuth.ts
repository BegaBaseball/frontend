import { DevUser } from '../types/cheer';

const KEY = 'devUser';

export function setDevUser(user: DevUser) {
  localStorage.setItem(KEY, JSON.stringify(user));
}

export function getDevUser(): DevUser | null {
  const raw = localStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : null;
}

export function removeDevUser() {
  localStorage.removeItem(KEY);
}

export function authFetch(input: RequestInfo, init: RequestInit = {}) {
  const user = getDevUser();
  const headers = new Headers(init.headers || {});
  
  if (user) {
    // 한글 헤더 값을 Base64로 인코딩
    headers.set('X-Debug-Email', user.email);
    headers.set('X-Debug-Name', btoa(encodeURIComponent(user.name)));
    headers.set('X-Debug-Team', user.team);
  }
  
  headers.set('Content-Type', 'application/json');
  
  return fetch(input, { 
    ...init, 
    headers,
    credentials: 'include' as RequestCredentials 
  });
}