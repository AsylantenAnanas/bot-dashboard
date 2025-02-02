import { io } from 'socket.io-client';

const socket = io(process.env.REACT_APP_SOCKET_URL, {
  withCredentials: true,
});

socket.on('connect', () => {
  console.log('[Socket] Verbunden:', socket.id);
});

socket.on('disconnect', () => {
  console.log('[Socket] Getrennt.');
});

export default socket;
