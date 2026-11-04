import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, UserCredential, Auth } from "firebase/auth";
import { getAnalytics, isSupported, Analytics } from "firebase/analytics";

// User's Firebase Web App Configuration
export const firebaseConfig = {
  apiKey: "AIzaSyCny5OySy6fuesgxI81GwRCeBCUhlOtulc",
  authDomain: "sellsyncai.firebaseapp.com",
  projectId: "sellsyncai",
  storageBucket: "sellsyncai.firebasestorage.app",
  messagingSenderId: "512039256659",
  appId: "1:512039256659:web:654a544c3f74de2244bca6",
  measurementId: "G-E01BJZDBZJ"
};

// Initialize Firebase as a singleton (safe for Next.js SSR / HMR)
const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth: Auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account"
});

// Analytics is only initialized on client-side if browser environment supports it
let analytics: Analytics | null = null;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(() => {
    // Analytics unsupported in non-browser or ad-blocked environment
  });
}

/**
 * Initiates the Firebase Google Sign-In popup flow
 */
export async function signInWithGooglePopup(): Promise<UserCredential> {
  return await signInWithPopup(auth, googleProvider);
}

export { app, auth, googleProvider, analytics };

