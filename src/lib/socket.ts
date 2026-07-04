import { io } from 'socket.io-client';

// Aapka backend port 4000 par chal raha hai
const BACKEND_URL = 'http://localhost:4000';

// 'autoConnect: false' rakha hai taaki hum manually connect karein jab canvas load ho
export const socket = io(BACKEND_URL, {
  autoConnect: false, 
});