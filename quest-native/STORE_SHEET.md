# Unearth Self — App Store first, Play copies the same shell

Location is on from v1 (FIELD_GPS=true). When In Use only. No camera. No background. No track off the device.

Display name: Unearth Self
Bundle id (D05 open): xyz.unearthself.quest

Review notes: No account. Guest ALEX. Facilitator FACIL. Token GAM2. Location is When In Use for field confirmation. No arrow. No track. Notes on device.

Mac: git checkout quest; npm install; npx vite build --config vite.quest.config.ts; npx cap add ios; bash quest-native/apply-permissions.sh; npx cap sync; npx cap open ios
