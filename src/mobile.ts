import resolution from "@/resolution";
import platform from "@/config/platforms/platform-web";

const MOBILE_STAGE_WIDTH = 720;
const MIN_MOBILE_STAGE_HEIGHT = 1280;
const MAX_MOBILE_STAGE_HEIGHT = 1800;

const clamp = (value: number, min: number, max: number): number => {
    return Math.min(max, Math.max(min, value));
};

const getPortraitStageHeight = (): number => {
    const viewportWidth = Math.max(window.innerWidth || 0, window.visualViewport?.width || 0);
    const viewportHeight = Math.max(
        window.innerHeight || 0,
        window.visualViewport?.height || 0,
        screen.height || 0,
        screen.availHeight || 0
    );

    if (viewportWidth <= 0 || viewportHeight <= 0) {
        return MIN_MOBILE_STAGE_HEIGHT;
    }

    const shortSide = Math.min(viewportWidth, viewportHeight);
    const longSide = Math.max(viewportWidth, viewportHeight);
    const stageHeight = Math.round(MOBILE_STAGE_WIDTH * (longSide / shortSide));

    return clamp(stageHeight, MIN_MOBILE_STAGE_HEIGHT, MAX_MOBILE_STAGE_HEIGHT);
};

const applyMobileStageCssVars = (stageHeight: number): void => {
    document.documentElement.style.setProperty("--mobile-stage-width", `${MOBILE_STAGE_WIDTH}px`);
    document.documentElement.style.setProperty("--mobile-stage-height", `${stageHeight}px`);
};

// 1. Zoom Gestures Blockers
document.addEventListener("touchmove", (e) => {
    if (e.touches.length > 1) {
        e.preventDefault();
    }
}, { passive: false });

let lastTouchEnd = 0;
document.addEventListener("touchend", (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
        e.preventDefault();
    }
    lastTouchEnd = now;
}, false);

// 2. Read and Apply Scale Mode
const SCALE_MODE_KEY = "ctr-mobile-scale-mode";
const currentScaleMode = (localStorage.getItem(SCALE_MODE_KEY) || "native") as "native" | "fit" | "crop";
const mobileStageHeight = getPortraitStageHeight();

// Export the active scale mode to window for access elsewhere
(window as unknown as Record<string, string>).mobileScaleMode = currentScaleMode;
(window as unknown as Record<string, number>).mobileStageHeight = mobileStageHeight;
applyMobileStageCssVars(mobileStageHeight);

document.addEventListener("DOMContentLoaded", () => {
    applyMobileStageCssVars(mobileStageHeight);
    document.body.classList.add(`scale-mode-${currentScaleMode}`);
    if (currentScaleMode === "native") {
        document.body.classList.add("ui-1920");
    }
});

// Apply resolution overrides before gameplay boots
if (currentScaleMode === "native") {
    resolution.CANVAS_WIDTH = MOBILE_STAGE_WIDTH;
    resolution.CANVAS_HEIGHT = mobileStageHeight;
    resolution.UI_WIDTH = MOBILE_STAGE_WIDTH;
    resolution.UI_HEIGHT = mobileStageHeight;
    resolution.PMY = 100;

    // Direct asset paths to 1920 high-res folder since 720 doesn't exist
    platform.resolutionBaseUrl = "images/1920/";
    platform.uiImageBaseUrl = "images/1920/ui/";
    platform.boxImageBaseUrl = "images/1920/ui/";
}

// 3. IndexedDB Fallback Save System (Runs silently in background)
const DB_NAME = "CTRMobileFallbackDB";
const STORE_NAME = "saveStore";
const SAVE_KEY = "ctr-js-data";

const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

const getBackupSave = async (): Promise<string | null> => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readonly");
            const store = tx.objectStore(STORE_NAME);
            const request = store.get(SAVE_KEY);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        console.error("IndexedDB get backup failed:", e);
        return null;
    }
};

const setBackupSave = async (dataStr: string): Promise<void> => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readwrite");
            const store = tx.objectStore(STORE_NAME);
            const request = store.put(dataStr, SAVE_KEY);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        console.error("IndexedDB set backup failed:", e);
    }
};

const deleteBackupSave = async (): Promise<void> => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readwrite");
            const store = tx.objectStore(STORE_NAME);
            const request = store.delete(SAVE_KEY);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        console.error("IndexedDB delete backup failed:", e);
    }
};

// Auto-restore save data on startup
(async () => {
    try {
        const localSave = localStorage.getItem(SAVE_KEY);
        if (!localSave || localSave === "{}") {
            const backup = await getBackupSave();
            if (backup && backup !== "{}") {
                console.log("Restoring game save from IndexedDB backup.");
                localStorage.setItem(SAVE_KEY, backup);
            }
        }
    } catch (err) {
        console.error("Failed to restore backup:", err);
    }
})();

// Intercept localStorage writes to keep IndexedDB synchronized
const originalSetItem = localStorage.setItem;
localStorage.setItem = function (key, value) {
    originalSetItem.apply(this, arguments as unknown as [string, string]);
    if (key === SAVE_KEY) {
        void setBackupSave(value);
    }
};

const originalRemoveItem = localStorage.removeItem;
localStorage.removeItem = function (key) {
    originalRemoveItem.apply(this, arguments as unknown as [string]);
    if (key === SAVE_KEY) {
        void deleteBackupSave();
    }
};
