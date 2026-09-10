# Unearth Self — App Store first, Play copies the same shell

Trail Quest is the app. Capacitor + bundled shell. Same binary family on Android.

Display name: Unearth Self
Bundle id (D05 open): xyz.unearthself.quest
Version: 0.1.0 (build 1)

v1 does not request location or camera. Facilitator token + paper. Flip FIELD_GPS after Horsethief is walked — both stores, same commit.

Paper still wins if the phone dies. C05 not closed.

## Blockers before Submit for Review

- Public privacy URL (paste quest-native/PRIVACY.md)
- Support URL
- Screenshots 6.7in and 6.1in (join, Today, Mirror, Hall)
- Age rating questionnaire

Do not submit without the privacy URL.

## Mac — iOS

```
git checkout quest && git pull --rebase origin quest
npm install
npx vite build --config vite.quest.config.ts
npx cap add ios && npx cap add android
cp quest-native/PrivacyInfo.xcprivacy ios/App/App/PrivacyInfo.xcprivacy
bash quest-native/apply-permissions.sh
npx cap sync && npx cap open ios
```

Xcode: xyz.unearthself.quest, 0.1.0 (1). Archive → TestFlight → Submit for Review.
Review notes: No account. Guest ALEX. Facilitator FACIL. Token GAM2. No location in this version. Notes on device.

## Android

Same shell, same FIELD_GPS=false. Same privacy URL. Play Data safety: no location, no camera, no shared notes.
