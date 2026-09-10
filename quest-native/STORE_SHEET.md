# Unearth Self — iOS and Android (Trail Quest)

Trail Quest is the app. It is not a page on the website.

Display name: Unearth Self
Bundle id (D05 still open): xyz.unearthself.quest
Tracks: TestFlight Internal and Play Internal only.

Website later ingests unearthself.field-card.v0 into CRM and profiles. Echo notes never go in that payload. No sync server in October.

## Mac

```bash
git fetch && git checkout quest && git pull --rebase origin quest
npm install
npm run quest:shell
npx cap add ios
npx cap add android
bash quest-native/apply-permissions.sh
npx cap sync
npx cap open ios
```

Xcode: team, bundle xyz.unearthself.quest, 0.1.0 (1). Archive → TestFlight Internal.
Play: signed AAB → Internal testing. allowBackup=false. No camera.

Join: ALEX / BRIA / CARL / DANA. Facilitator FACIL. Token GAM2.
