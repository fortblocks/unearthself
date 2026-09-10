# Trail Quest store shell — Mac + Play sheet

APP-02. Wrapper only. C05 is not closed. Public store listing is out of scope.

Display name: **Unearth Self**  
Bundle / application id (recommendation, D05 open): **xyz.unearthself.quest**  
Product URL the WebView loads: **https://unearthself.xyz/quest**

A Linux sandbox cannot sign or upload an IPA. Christopher uploads from his Mac.

## Wrap choice

Capacitor 8 over the existing `/quest` PWA. Not React Native. Not Flutter. Not a TWA.
TWA rejected: canyon radio is poor. Capacitor gives native geo, haptics, and `allowBackup=false`.
First open on Basecamp Wi-Fi so the service worker caches `/quest`. Paper still wins.

## Mac one-time

```bash
git pull
npm install
npx cap add ios
npx cap add android
bash quest-native/apply-permissions.sh
npx cap sync
npx cap open ios     # Xcode
npx cap open android # Studio, optional
```

Full TestFlight + Play Internal steps are in this file in the repo after pull. Version 0.1.0 / build 1. Internal tracks only. No App Review. No production track.

Demo codes: ALEX BRIA CARL DANA. Facilitator FACIL. Paper token e.g. GAM2.
