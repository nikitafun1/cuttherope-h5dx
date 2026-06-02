# Cut the Rope - Mobile Android Build Guide

This document describes the mobile Android port of Cut the Rope (`cuttherope-h5dx`) using Capacitor.

## Requirements

1. **Node.js** (v18+)
2. **Java Development Kit (JDK)** (version 17 or higher recommended for modern Gradle/Android builds)
3. **Android SDK** (located at `D:\Programs\AndroidSDK`)

## Technical Details

- **Logical Viewport & Physics:**
  - Cut the Rope levels are natively built on a `320x480` vertical grid (2:3 aspect ratio).
  - In **Native Portrait** mode, the viewport canvas is configured as `720x1280` (9:16).
  - The level scales up using a multiplier `PM = 2.25` which yields a size of `720x1080`.
  - The `720x1080` gameplay box fits the screen width perfectly and is centered vertically on the screen (leaving `100px` borders at the top and bottom).
  - The vertical borders are filled dynamically by repeating the level background texture vertically.
  - Screen elements like the restart menu and score counter are shifted to the absolute top and bottom screen edges using CSS relative to the safe-area notches.
  
- **Saves & Progression:**
  - The application saves progress to `localStorage` under the key `ctr-js-data`.
  - A silent **IndexedDB Fallback Save System** runs in the background. On every write, a backup is copied to IndexedDB.
  - If `localStorage` is wiped on app restart, the save is restored automatically from IndexedDB.

- **Scaling Modes:**
  The game supports three scaling configurations (stored in `localStorage` under `ctr-mobile-scale-mode`):
  1. `native` (Native Portrait - default) - Centered viewport with vertical background tiling.
  2. `crop` (Portrait Fill) - Spreads canvas to crop side borders.
  3. `fit` (Original Fit) - Landscape letterboxing.

## Building the App

To compile the web assets, sync the folder, and generate the debug and release APK files, double-click or run:
```cmd
build_android.bat
```

Alternatively, run the steps manually:
1. Compile the web assets:
   ```bash
   npm run build
   ```
2. Sync the compiled files with Capacitor:
   ```bash
   npx cap sync
   ```
3. Compile the APKs using the Gradle wrapper inside the `android` folder:
   ```bash
   cd android
   .\gradlew.bat assembleDebug
   .\gradlew.bat assembleRelease
   ```

## Output Locations

After a successful compilation, the compiled APK binaries are saved to:
- **Debug APK:** `android\app\build\outputs\apk\debug\app-debug.apk`
- **Release APK:** `android\app\build\outputs\apk\release\app-release-unsigned.apk`

*Note: The release APK is unsigned. To install it, sign it using `apksigner` from the Android SDK build-tools.*
