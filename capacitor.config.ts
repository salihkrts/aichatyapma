import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.kael.aichat",
  appName: "KaelAIChat",
  webDir: "public",
  server: {
    // Canlı sunucu adresi (Next.js server API'leri, yapay zeka & Supabase doğrudan çalışır)
    url: "https://kaelaichat.vercel.app",
    cleartext: false,
    androidScheme: "https",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1600,
      launchAutoHide: true,
      backgroundColor: "#0a0612",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0a0612",
    },
  },
};

export default config;
