# InspectPro Android app (Google Play)

The APK is the same React frontend packed with **Capacitor 8** (`android/`).
App id: `ae.inspectpro.app` (permanent on Google Play — never change it).
Target SDK 36, min SDK 24 (Android 7+).

## One-time setup on this PC

1. Install **Android Studio** (it brings the JDK + Android SDK):
   https://developer.android.com/studio
   Open it once and let it finish downloading the SDK.
2. Create the **upload key** (keep TWO backups off this PC — losing it means
   you can't update the app). In PowerShell:

   ```powershell
   cd D:\inspection-react-full\android
   & "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -genkeypair -v -keystore inspectpro-upload.jks -alias inspectpro -keyalg RSA -keysize 2048 -validity 10000
   ```
3. Create `android\keystore.properties` (git-ignored):

   ```
   storeFile=../inspectpro-upload.jks
   storePassword=<your password>
   keyAlias=inspectpro
   keyPassword=<your password>
   ```

## Every release

1. Raise `versionCode` (+1) and `versionName` in `android/app/build.gradle`.
2. `pnpm run android:sync` — builds the web bundle and copies it into the app.
3. Build the Play bundle:

   ```powershell
   cd D:\inspection-react-full\android
   .\gradlew.bat bundleRelease
   ```
   → `android\app\build\outputs\bundle\release\app-release.aab` (upload this to Play).

   For a phone test APK: `.\gradlew.bat assembleDebug`
   → `android\app\build\outputs\apk\debug\app-debug.apk`.

## What the app adds over the website

- Camera (QR / barcode / photos) and location (driver trip) as real Android permissions.
- Excel / PDF / ZIP exports open the Android share sheet (`src/utils/nativeDownloads.js`);
  the WebView can't download blob files by itself.
- Server CORS always allows the app origin `https://localhost` (server d74f165).

Note: web changes reach the app only with a new release (`android:sync` + new bundle).

## Play Console checklist

- Developer account (one-time 25 USD). An **organization** account needs a D-U-N-S number.
- Store listing: name, short + full description (AR/EN), 512×512 icon
  (`assets/icon-only.png` resized), 1024×500 feature graphic, ≥2 phone screenshots.
- Privacy policy URL (required: the app uses camera + location).
- Data safety form: account info, photos, approximate/precise location; data is encrypted in transit.
- App access: give Google a **demo login** (the app opens on a login screen).
- Content rating questionnaire, target audience 18+.
- New personal accounts must run a closed test with 12 testers for 14 days before production.
