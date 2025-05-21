import { Link } from 'react-router-dom';
import styles from './Navbar.module.css'; // Import the CSS module

export default function Navbar() {
  return (
    <nav className={styles.navContainer}>
      <div className={styles.logo}>Silver Screen</div>
      <ul className={styles.navList}>
        <li className={styles.navItem}>
          <Link to="/" className={styles.link}>Home</Link>
        </li>
        <li className={styles.navItem}>
          <Link to="/about" className={styles.link}>About</Link>
        </li>
      </ul>
    </nav>
  );
}