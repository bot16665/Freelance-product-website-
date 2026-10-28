import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

// Firebase is used ONLY for signing in (Google login).
// All data lives in your own SQL database, behind the /api routes.
const firebaseConfig = {
  apiKey: "AIzaSyBz3avaumZ10WzJsx8_m9iPsuvxP6pHhXw",
  authDomain: "printer-sys.firebaseapp.com",
  projectId: "printer-sys",
  appId: "1:194554037874:web:9e1fa2dc821b70d79164eb",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
