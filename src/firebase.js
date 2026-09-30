import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC98S5VPkaJXuEdwzonBVnlKrfR90JvMls",
  authDomain: "ramesh-construction-ab9fe.firebaseapp.com",
  projectId: "ramesh-construction-ab9fe",
  messagingSenderId: "556855819715",
  appId: "1:556855819715:web:91cfbfbf819226c5f9d176",
  measurementId: "G-RTYEFBB9L8"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
