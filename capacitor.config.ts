import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.businesscadence.app",
  appName: "BusinessCadence",
  webDir: "dist/public",
  server: {
    // During development, point to the live web server so you can test
    // on a real device without rebuilding every time.
    // Comment this out for production builds.
    // url: "https://businesscadence.com",
    // cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#0A1929",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "Dark",
      backgroundColor: "#0A1929",
    },
    Keyboard: {
      resize: "body",
      style: "dark",
      resizeOnFullScreen: true,
    },
  },
  ios: {
    contentInset: "automatic",
    backgroundColor: "#0A1929",
    preferredContentMode: "mobile",
  },
  android: {
    backgroundColor: "#0A1929",
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
