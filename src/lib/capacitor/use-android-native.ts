"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { App as CapApp } from "@capacitor/app";
import { SplashScreen } from "@capacitor/splash-screen";

interface AndroidNativeOptions {
  activeTab: string;
  onNavigateBack: () => void;
  isAnyModalOpen?: boolean;
  onCloseModals?: () => void;
}

export function useAndroidNative({
  activeTab,
  onNavigateBack,
  isAnyModalOpen = false,
  onCloseModals,
}: AndroidNativeOptions) {
  useEffect(() => {
    if (typeof window === "undefined" || !Capacitor.isNativePlatform()) return;

    // 1. Durum Çubuğunu (Status Bar) Koyu Tema Yap
    StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
    StatusBar.setBackgroundColor({ color: "#0a0612" }).catch(() => {});

    // 2. Açılış Ekranını (Splash Screen) Gizle
    SplashScreen.hide().catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !Capacitor.isNativePlatform()) return;

    // 3. Android Yerel Geri Tuşu (Hardware Back Button) Yönetimi
    const backListener = CapApp.addListener("backButton", () => {
      if (isAnyModalOpen && onCloseModals) {
        onCloseModals();
        return;
      }

      if (activeTab !== "explore") {
        onNavigateBack();
        return;
      }

      // Keşfet ana sayfasındaysa uygulamadan çık
      CapApp.exitApp();
    });

    return () => {
      backListener.then((handle) => handle.remove()).catch(() => {});
    };
  }, [activeTab, onNavigateBack, isAnyModalOpen, onCloseModals]);
}
