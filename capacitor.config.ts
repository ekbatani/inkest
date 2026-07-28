interface LocalCapacitorConfig {
  appId: string;
  appName: string;
  webDir: string;
  bundledWebRuntime?: boolean;
  server?: {
    androidScheme?: string;
    cleartext?: boolean;
    url?: string;
  };
  plugins?: Record<string, Record<string, unknown>>;
}

const config: LocalCapacitorConfig = {
  appId: "com.inkest.app",
  appName: "Inkest",
  webDir: "out",
  bundledWebRuntime: false,
  server: {
    androidScheme: "https",
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: "#18181b",
      androidSplashResourceName: "splash",
      splashFullScreen: true,
      splashImmersive: true,
    },
    Keyboard: {
      resize: "body",
      style: "DARK",
      resizeOnFullScreen: true,
    },
  },
};

export default config;
