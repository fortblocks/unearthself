# Trail Quest store shell — Mac sheet

C05 holds. Capacitor is a distribution shell around a bundled `/quest` pack. It does not load the live website in the canyon.

Display name: Unearth Self
Bundle id (recommendation, D05 open): xyz.unearthself.quest

## Offline decision

Bundle the `/quest` shell into the app binary. The day runs with the radio off. Paper is the fallback when the phone dies, not when the radio dies.

A live server.url to unearthself.xyz fails below the rim. Service workers inside WKWebView are unreliable. Add to Home Screen is kinder than a thin live WebView, and remains the no-store path. It is not kinder than a bundled binary for Horsethief.

## Mac

```bash
git fetch && git checkout quest && git pull --rebase origin quest
npm install
npm run quest:shell
npx cap add ios
npx cap add android
bash quest-native/apply-permissions.sh
npm run quest:native:sync
npx cap open ios
```

Xcode: team, bundle xyz.unearthself.quest, version 0.1.0 build 1. Archive → App Store Connect → TestFlight Internal. No App Review.

Play: signed AAB → Internal testing only. allowBackup must stay false.

Join is /quest. Codes ALEX / BRIA / CARL / DANA. Facilitator FACIL. Paper token GAM2. Airplane mode after launch — pack still there.

A04 is this phone only. No sync server in October.
