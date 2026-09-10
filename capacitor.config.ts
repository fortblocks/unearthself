import type { CapacitorConfig } from "@capacitor/cli";

/**
 * APP-02 store shell. C05 is not closed.
 * Bundled /quest shell. Live site URL is not loaded below the rim.
 * Paper is the fallback when the phone dies, not when the radio dies.
 * Bundle id recommendation (D05 open): xyz.unearthself.quest
 */
const config: CapacitorConfig = {
  appId: "xyz.unearthself.quest",
  appName: "Unearth Self",
  webDir: "quest-native/www",
  android: {
    allowMixedContent: false,
    backgroundColor: "#161718",
  },
  ios: {
    backgroundColor: "#161718",
    contentInset: "never",
    preferredContentMode: "mobile",
  },
  plugins: {
    SplashScreen: {
      backgroundColor: "#161718",
      launchShowDuration: 400,
      launchAutoHide: true,
      showSpinner: false,
    },
    StatusBar: {
      backgroundColor: "#161718",
      style: "DARK",
    },
  },
};

export default config;
