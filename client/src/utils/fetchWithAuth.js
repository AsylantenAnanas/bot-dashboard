import { message } from 'antd';

/**
 * fetchWithAuth
 *  - credentials: 'include'
 *  - Falls HTTP 401, -> redirect to /login
 *  - Returns the fetch Response object
 */
export async function fetchWithAuth(url, options = {}, navigate) {
  const baseUrl = process.env.REACT_APP_API_BASE_URL || '';
  const isAbsolute = /^https?:\/\//i.test(url);
  const fullUrl = isAbsolute ? url : `${baseUrl}${url}`;

  const defaultOptions = {
    credentials: 'include'
  };
  const merged = { ...defaultOptions, ...options };

  let response;
  try {
    response = await fetch(fullUrl, merged);
  } catch (err) {
    message.error('Netzwerkfehler oder Server nicht erreichbar.');
    throw err;
  }

  if (response.status === 401) {
    // Session invalid -> redirect
    navigate('/login', { replace: true });
    return response; 
  }

  return response;
}
