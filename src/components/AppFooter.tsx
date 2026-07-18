import styles from "./AppFooter.module.css";

export default function AppFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        &copy; {new Date().getFullYear()} Adaptive Interview Assessment Platform
      </div>
    </footer>
  );
}
