import { useEffect, useState, useSyncExternalStore } from "react";
import { apiFetch } from "./api";
import { isOnline, queueOfflineAction } from "./offline";

const SAVED_IDS_KEY = "shift_saved_ids";
const SAVED_ITEMS_KEY = "shift_saved_items";

// Reactive listeners for any bookmark changes
const listeners = new Set();

function emit() {
    listeners.forEach((fn) => fn());
}

function readStoredIds() {
    try {
        const stored = JSON.parse(localStorage.getItem(SAVED_IDS_KEY));
        return {
            words: new Set(stored?.words || []),
            articles: new Set(stored?.articles || [])
        };
    } catch {
        return { words: new Set(), articles: new Set() };
    }
}

function writeStoredIds(ids) {
    try {
        localStorage.setItem(
            SAVED_IDS_KEY,
            JSON.stringify({
                words: Array.from(ids.words),
                articles: Array.from(ids.articles)
            })
        );
    } catch (err) {
        console.error("Failed to cache saved ids", err);
    }
}

let cachedIds = readStoredIds();

export function isItemSaved(type, itemId) {
    if (!itemId) return false;
    const norm = itemId.trim().toLowerCase();
    if (type === "word") return cachedIds.words.has(norm);
    if (type === "article") return cachedIds.articles.has(norm);
    return false;
}

export async function refreshSavedIds() {
    if (!isOnline()) return cachedIds;
    try {
        const res = await apiFetch("/saved/ids");
        if (res.ok) {
            const data = await res.json();
            cachedIds = {
                words: new Set((data.wordIds || []).map((w) => w.trim().toLowerCase())),
                articles: new Set((data.articleIds || []).map((a) => a.trim().toLowerCase()))
            };
            writeStoredIds(cachedIds);
            emit();
        }
    } catch {
        // use cached IDs
    }
    return cachedIds;
}

export async function fetchSavedItems(type) {
    // 1. Return cached items if available
    let localItems = [];
    try {
        localItems = JSON.parse(localStorage.getItem(SAVED_ITEMS_KEY)) || [];
    } catch {
        localItems = [];
    }

    if (!isOnline()) {
        if (type) {
            return localItems.filter((it) => it.type === type);
        }
        return localItems;
    }

    try {
        const path = type ? `/saved?type=${type}` : "/saved";
        const res = await apiFetch(path);
        if (res.ok) {
            const items = await res.json();
            // Cache full saved list
            try {
                localStorage.setItem(SAVED_ITEMS_KEY, JSON.stringify(items));
            } catch {}

            // Keep IDs synced
            const words = new Set();
            const articles = new Set();
            for (const it of items) {
                const norm = it.itemId.trim().toLowerCase();
                if (it.type === "word") words.add(norm);
                if (it.type === "article") articles.add(norm);
            }
            cachedIds = { words, articles };
            writeStoredIds(cachedIds);
            emit();

            return items;
        }
    } catch (err) {
        console.error("Failed to fetch saved items:", err);
    }

    if (type) {
        return localItems.filter((it) => it.type === type);
    }
    return localItems;
}

export async function toggleSaveItem({ type, itemId, title, content }) {
    if (!itemId) return false;
    const norm = itemId.trim().toLowerCase();
    const currentlySaved = isItemSaved(type, norm);

    if (currentlySaved) {
        await unsaveItem({ type, itemId: norm });
        return false;
    } else {
        await saveItem({ type, itemId: norm, title, content });
        return true;
    }
}

export async function saveItem({ type, itemId, title, content }) {
    const norm = itemId.trim().toLowerCase();
    
    // 1. Optimistically add to cached IDs
    if (type === "word") cachedIds.words.add(norm);
    if (type === "article") cachedIds.articles.add(norm);
    writeStoredIds(cachedIds);

    // Optimistically update cached items
    try {
        const items = JSON.parse(localStorage.getItem(SAVED_ITEMS_KEY)) || [];
        const existingIdx = items.findIndex((it) => it.type === type && it.itemId.toLowerCase() === norm);
        const newItem = {
            _id: `temp_${Date.now()}`,
            type,
            itemId: norm,
            title: title || itemId,
            content,
            createdAt: new Date().toISOString()
        };
        if (existingIdx >= 0) {
            items[existingIdx] = newItem;
        } else {
            items.unshift(newItem);
        }
        localStorage.setItem(SAVED_ITEMS_KEY, JSON.stringify(items));
    } catch {}

    emit();

    // 2. Persist to server or queue offline
    const body = { type, itemId: norm, title: title || itemId, content };
    if (!isOnline()) {
        queueOfflineAction({
            endpoint: "/saved",
            method: "POST",
            body
        });
        return { success: true, offline: true };
    }

    try {
        const res = await apiFetch("/saved", {
            method: "POST",
            body: JSON.stringify(body)
        });
        if (res.ok) {
            const saved = await res.json();
            return { success: true, item: saved };
        } else {
            throw new Error("Failed to save");
        }
    } catch (err) {
        queueOfflineAction({
            endpoint: "/saved",
            method: "POST",
            body
        });
        return { success: true, offline: true };
    }
}

export async function unsaveItem({ type, itemId, id }) {
    const norm = itemId ? itemId.trim().toLowerCase() : null;

    // 1. Optimistically remove from cached IDs
    if (norm) {
        if (type === "word") cachedIds.words.delete(norm);
        if (type === "article") cachedIds.articles.delete(norm);
        writeStoredIds(cachedIds);
    }

    // Optimistically remove from cached items
    try {
        const items = JSON.parse(localStorage.getItem(SAVED_ITEMS_KEY)) || [];
        const filtered = items.filter((it) => {
            if (id && it._id === id) return false;
            if (norm && it.type === type && it.itemId.toLowerCase() === norm) return false;
            return true;
        });
        localStorage.setItem(SAVED_ITEMS_KEY, JSON.stringify(filtered));
    } catch {}

    emit();

    // 2. Persist to server or queue offline
    const endpoint = id ? `/saved/${id}` : `/saved?type=${type}&itemId=${encodeURIComponent(norm)}`;
    const method = "DELETE";

    if (!isOnline()) {
        queueOfflineAction({ endpoint, method });
        return { success: true, offline: true };
    }

    try {
        const res = await apiFetch(endpoint, { method });
        if (res.ok) {
            return { success: true };
        } else {
            throw new Error("Failed to unsave");
        }
    } catch {
        queueOfflineAction({ endpoint, method });
        return { success: true, offline: true };
    }
}

// React Hook to watch saved status of a single item
export function useIsSaved(type, itemId) {
    const norm = itemId ? itemId.trim().toLowerCase() : "";
    return useSyncExternalStore(
        (listener) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        () => isItemSaved(type, norm)
    );
}
