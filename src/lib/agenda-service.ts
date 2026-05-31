import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp,
  deleteDoc
} from "firebase/firestore";
import { db } from "./firebase";
import { AgendaItem } from "@/types/agenda";

export const agendaService = {
  // Save or update an item
  async saveItem(userId: string, item: Partial<AgendaItem> & { id: string }) {
    const itemRef = doc(db, "users", userId, "items", item.id);
    
    // Using setDoc with merge: true to handle both create and update
    await setDoc(itemRef, {
      ...item,
      updatedAt: serverTimestamp(),
      createdAt: item.createdAt || serverTimestamp(),
    }, { merge: true });
  },

  // Update AI results specifically
  async updateAiResults(userId: string, itemId: string, aiParsed: AgendaItem['aiParsed']) {
    const itemRef = doc(db, "users", userId, "items", itemId);
    await updateDoc(itemRef, {
      aiParsed,
      updatedAt: serverTimestamp(),
    });
  },

  // Subscribe to all active items
  subscribeToItems(userId: string, callback: (items: AgendaItem[]) => void) {
    const itemsRef = collection(db, "users", userId, "items");
    const q = query(itemsRef, orderBy("createdAt", "desc"));

    return onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          // Convert Firebase Timestamps back to numbers for our interface if needed
          createdAt: data.createdAt?.toMillis?.() || Date.now(),
          updatedAt: data.updatedAt?.toMillis?.() || Date.now(),
        } as AgendaItem;
      });
      callback(items);
    });
  },

  // Archive an item
  async archiveItem(userId: string, itemId: string) {
    const itemRef = doc(db, "users", userId, "items", itemId);
    await updateDoc(itemRef, {
      status: 'archived',
      updatedAt: serverTimestamp(),
    });
  },

  // Update item raw text
  async updateItemText(userId: string, itemId: string, rawText: string) {
    const itemRef = doc(db, "users", userId, "items", itemId);
    await updateDoc(itemRef, {
      rawText,
      updatedAt: serverTimestamp(),
    });
  },

  // Update user overrides
  async updateOverrides(userId: string, itemId: string, overrides: AgendaItem['userOverrides']) {
    const itemRef = doc(db, "users", userId, "items", itemId);
    await updateDoc(itemRef, {
      userOverrides: overrides,
      updatedAt: serverTimestamp(),
    });
  }
};
