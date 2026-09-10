# First run on the Mac — Xcode tonight

Branch: `quest`.

You need: Xcode (open it once and accept the licence), Node 22, an Apple ID. Simulator works with a free Apple ID. A paid Developer account is only required for a physical iPhone.

## 1. Tools

```bash
xcode-select --install
sudo xcodebuild -license accept
node -v    # 22+
```

## 2. Repo

```bash
git clone git@github.com:fortblocks/unearthself.git
cd unearthself
git fetch origin && git checkout quest && git pull --rebase origin quest
npm install
```

## 3. Shell + Xcode

```bash
npx cap add ios
npx cap add android
cp quest-native/PrivacyInfo.xcprivacy ios/App/App/PrivacyInfo.xcprivacy
npm run quest:ios
```

## 4. Xcode

App target. Signing: your Team. Bundle `xyz.unearthself.quest`. Destination: iPhone 16 simulator. Run.

Join codes: ALEX (guest), FACIL (facilitator). Token GAM2.

## 5. After code changes

```bash
git pull --rebase origin quest
npm run quest:ios
```

Do not hand-edit generated `ios/` except signing. Product is `src/routes/quest*`.
