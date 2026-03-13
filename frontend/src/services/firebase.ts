import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDuAC1UD_fzFZjl2L51th-8kryRvC4SVHk",
  authDomain: "tradesent-ai.firebaseapp.com",
  projectId: "tradesent-ai",
  storageBucket: "tradesent-ai.firebasestorage.app",
  messagingSenderId: "916357104762",
  appId: "1:916357104762:web:9f0f75e0a71f26176ca7c3",
  measurementId: "G-BG50HJ0M3E",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logout = () => signOut(auth);
export { onAuthStateChanged, type User };
