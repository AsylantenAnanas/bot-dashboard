// client/src/utils/fetchWithAuth.js
import { message } from 'antd';

/**
 * fetchWithAuth
 *  - credentials: 'include'
 *  - Falls HTTP 401, -> redirect to /login
 *  - wir geben das fetch-Response-Objekt zurück
 */
export async function fetchWithAuth(url, options = {}, navigate) {
  const defaultOptions = {
    credentials: 'include'
  };
  const merged = { ...defaultOptions, ...options };

  let response;
  try {
    response = await fetch(url, merged);
  } catch (err) {
    message.error('Netzwerkfehler oder Server nicht erreichbar.');
    throw err;
  }

  if (response.status === 401) {
    // Session ungültig -> leiten wir direkt um
    navigate('/login', { replace: true });
    return response; 
  }

  return response;
}
