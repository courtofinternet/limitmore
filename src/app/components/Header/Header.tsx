import React from 'react';
import styles from './Header.module.css';

interface HeaderProps {
    onNavigate: (page: 'landing' | 'markets') => void;
    currentPage: 'landing' | 'markets';
}

const Header: React.FC<HeaderProps> = ({ onNavigate, currentPage }) => {
    return (
        <header className={styles.header}>
            <div className={styles.left}>
                <div
                    className={styles.logo}
                    onClick={() => onNavigate('landing')}
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <img src="/favicon.ico" alt="Logo" style={{ width: '24px', height: '24px' }} />
                    <h1 style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '-0.5px' }}>Limitmore</h1>
                </div>
                <nav className={styles.nav}>
                    <span
                        className={`${styles.navItem} ${currentPage === 'markets' ? styles.active : ''}`}
                        onClick={() => onNavigate('markets')}
                    >
                        Markets
                    </span>
                </nav>
            </div>
            <div className={styles.right}>
                {/* Right side items removed as per request */}
            </div>
        </header>
    );
};

export default Header;
