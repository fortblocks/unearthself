import type { CapacitorConfig } from "@capacitor/cli";

/**
 * APP-02 store shell. C05 is not closed.
 * Product remains the /quest PWA + paper. This file only wraps it.
 * Bundle id is a recommendation (D05 open): xyz.unearthself.quest
 * Display name: Unearth Self
 */
const config: CapacitorConfig = {
  appId: "xyz.unearthself.quest",
  appName: "Unearth Self",
  webDir: "quest-native/www",
  server: {
    url: "https://unearthself.xyz/quest",
    androidScheme: "https",
    allowNavigation: ["unearthself.xyz", "*.unearthself.xyz"],
  },
  plugins: {
    SplashScreen: {
      backgroundColor: "#161718",
      launchShowDuration: 800,
      launchAutoHide: true,
      showSpinner: false,
    },
    StatusBar: {
      backgroundColor: "#161718",
      style: "DARK",
    },
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#161718",
  },
  ios: {
    backgroundColor: "#161718",
    contentInset: "automatic",
    preferredContentMode: "mobile",
    limitsNavigationsToAppBoundDomains: true,
  },
};

export default config;
