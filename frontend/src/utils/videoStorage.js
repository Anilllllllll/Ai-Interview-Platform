/**
 * videoStorage.js — IndexedDB helper for storing interview video recordings.
 * Videos are stored as Blobs keyed by interview session ID.
 */

const DB_NAME = "InterviewAI_Videos";
const DB_VERSION = 1;
const STORE_NAME = "recordings";

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: "sessionId" });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Save a video blob to IndexedDB.
 * @param {string} sessionId
 * @param {Blob} blob
 */
export async function saveRecording(sessionId, blob) {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readwrite");
            tx.objectStore(STORE_NAME).put({
                sessionId,
                blob,
                createdAt: Date.now(),
                size: blob.size,
            });
            tx.oncomplete = () => { db.close(); resolve(); };
            tx.onerror = () => { db.close(); reject(tx.error); };
        });
    } catch (err) {
        console.warn("[VideoStorage] Failed to save:", err.message);
    }
}

/**
 * Load a video blob from IndexedDB.
 * @param {string} sessionId
 * @returns {Promise<Blob|null>}
 */
export async function loadRecording(sessionId) {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readonly");
            const req = tx.objectStore(STORE_NAME).get(sessionId);
            req.onsuccess = () => {
                db.close();
                resolve(req.result?.blob || null);
            };
            req.onerror = () => { db.close(); reject(req.error); };
        });
    } catch (err) {
        console.warn("[VideoStorage] Failed to load:", err.message);
        return null;
    }
}

/**
 * Delete a recording from IndexedDB.
 * @param {string} sessionId
 */
export async function deleteRecording(sessionId) {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readwrite");
            tx.objectStore(STORE_NAME).delete(sessionId);
            tx.oncomplete = () => { db.close(); resolve(); };
            tx.onerror = () => { db.close(); reject(tx.error); };
        });
    } catch (err) {
        console.warn("[VideoStorage] Failed to delete:", err.message);
    }
}
