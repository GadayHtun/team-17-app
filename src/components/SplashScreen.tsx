"use client";

import { useEffect, useState } from "react";
import styles from "./SplashScreen.module.css";

export default function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Skip splash if already shown this session
    if (sessionStorage.getItem("splash-seen")) {
      setVisible(false);
      return;
    }

    const fadeTimer = setTimeout(() => setFadeOut(true), 3000);
    const hideTimer = setTimeout(() => {
      setVisible(false);
      sessionStorage.setItem("splash-seen", "1");
      document.body.classList.remove("splash-active");
    }, 3500);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div data-splash className={`${styles.splash} ${fadeOut ? styles.splashHide : ""}`}>
      <img src="/logo.png" alt="Logo" className={styles.logoImg} />
      <div className={styles.logoText}>Adaptive Interview Assessment Platform</div>
      <div className={styles.loader}>
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.dot} />
      </div>
    </div>
  );
}
