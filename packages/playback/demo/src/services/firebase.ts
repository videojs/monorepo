import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, User, signOut } from "firebase/auth";
import { getFirestore, collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { Preset } from "../types/preset";
import { Tag } from "../types/tag";

const firebaseConfig = {
  apiKey: "AIzaSyD3D8QY5FxCylVOvJvLZGRAAo9bn2XUKvc",
  authDomain: "vhs-next-demo-page-test.firebaseapp.com",
  projectId: "vhs-next-demo-page-test",
  storageBucket: "vhs-next-demo-page-test.firebasestorage.app",
  messagingSenderId: "1057286817672",
  appId: "1:1057286817672:web:f815a96e3f151263775c3d",
  measurementId: "G-2SW9LFGH80"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const subscribeToAuthState = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, user => callback(user));
};

export const signOutCurrentUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    return alert('Problem encountered while signing out');
  }
};

// **************** Firestore operations **************** 

const db = getFirestore(app);
const presetsRef = collection(db, "presets");
const tagsRef = collection(db, "tags");

// Subscribe to keep firestore and zustand in-sync automatically
export const subscribeToPresets = (callback: (presets: Preset[]) => void) => {
  return onSnapshot(presetsRef, (snapshot) => {
    const presets = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Preset));
    callback(presets);
  });
};

// CRUD operations
export const addPreset = async (newPreset: Omit<Preset, "id">) => {
  await addDoc(presetsRef, newPreset);
};

export const updatePreset = async (id: string, updatedPreset: Partial<Preset>) => {
  const presetRef = doc(db, "presets", id);

  await updateDoc(presetRef, updatedPreset);
};

export const deletePreset = async (id: string) => {
  await deleteDoc(doc(db, "presets", id));
};

// TODO: Add add,update,delete CRUD operations for Tags

// Subscribe to keep firestore and zustand in-sync automatically
export const subscribeToTags = (callback: (tags: Tag[]) => void) => {
  return onSnapshot(tagsRef, (snapshot) => {
    const tags = snapshot.docs.map((doc) => doc.data() as Tag);

    callback(tags);
  });
};
