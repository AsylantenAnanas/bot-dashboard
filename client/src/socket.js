// client/src/socket.js
import { io } from 'socket.io-client';

const socket = io('https://bot-dashboard.meinserver.dev', {
  withCredentials: true,
});

socket.on('connect', () => {
  console.log('[Socket] Verbunden:', socket.id);
});

socket.on('disconnect', () => {
  console.log('[Socket] Getrennt.');
});

export default socket;
