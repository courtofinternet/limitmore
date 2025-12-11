import React, { useState } from 'react';
import styles from './TradeBox.module.css';

interface TradeBoxProps {
    probability: number;
}

const TradeBox: React.FC<TradeBoxProps> = ({ probability }) => {
    const [tradeAction, setTradeAction] = useState<'Buy' | 'Sell'>('Buy');
    const [amount, setAmount] = useState<string>('');
    const [selectedOutcome, setSelectedOutcome] = useState<'YES' | 'NO'>('YES');

    const numericAmount = parseFloat(amount) || 0;
    const noProbability = (100 - probability).toFixed(1);
    const outcomePrice = selectedOutcome === 'YES' ? probability / 100 : (100 - probability) / 100;
    const potentialPayout = numericAmount > 0 ? (numericAmount / outcomePrice).toFixed(2) : '0';

    return (
        <div className={styles.tradeBox}>
            <div className={styles.toggleSwitch}>
                <div
                    className={`${styles.toggleOption} ${tradeAction === 'Buy' ? styles.toggleActive : ''}`}
                    onClick={() => setTradeAction('Buy')}
                >
                    Buy
                </div>
                <div
                    className={`${styles.toggleOption} ${tradeAction === 'Sell' ? styles.toggleActive : ''}`}
                    onClick={() => setTradeAction('Sell')}
                >
                    Sell
                </div>
            </div>

            <div className={styles.inputGroup}>
                <div className={styles.inputLabel}>
                    <span>❶</span> Enter amount
                    <span className={styles.pctOptions}>
                        <span onClick={() => setAmount('100')}>10%</span>
                        <span onClick={() => setAmount('250')}>25%</span>
                        <span onClick={() => setAmount('500')}>50%</span>
                    </span>
                </div>
                <div className={styles.amountInputContainer}>
                    <input
                        type="number"
                        className={styles.amountInput}
                        placeholder="0"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                    />
                    <span className={styles.usdcSuffix}>USDC</span>
                </div>
                <div className={styles.slippage}>
                    <span>Slippage Tolerance 5%</span>
                    <span>⌄</span>
                </div>
            </div>

            <div className={styles.inputGroup}>
                <div className={styles.inputLabel}>
                    <span>❷</span> Select outcome
                </div>
                <div className={styles.outcomeSelect}>
                    <button
                        className={`${styles.outcomeCard} ${styles.outcomeCardGreen} ${selectedOutcome === 'YES' ? styles.selectedOutcome : styles.unselectedOutcome}`}
                        onClick={() => setSelectedOutcome('YES')}
                    >
                        <div>
                            <div>YES {probability.toFixed(1)}%</div>
                            <div className={styles.outcomeSubtext}>To Win {selectedOutcome === 'YES' ? potentialPayout : '0'} USDC</div>
                        </div>
                        {selectedOutcome === 'YES' && <span>Do it</span>}
                    </button>
                    <button
                        className={`${styles.outcomeCard} ${styles.outcomeCardOrange} ${selectedOutcome === 'NO' ? styles.selectedOutcome : styles.unselectedOutcome}`}
                        onClick={() => setSelectedOutcome('NO')}
                    >
                        <div>
                            <div>NO {(100 - probability).toFixed(1)}%</div>
                            <div className={styles.outcomeSubtext}>To Win {selectedOutcome === 'NO' ? potentialPayout : '0'} USDC</div>
                        </div>
                        {selectedOutcome === 'NO' && <span>Do it</span>}
                    </button>
                </div>
            </div>

            <button className={styles.payoutButton}>
                {tradeAction} {selectedOutcome} for {numericAmount > 0 ? numericAmount : '0'} USDC
            </button>
        </div>
    );
};

export default TradeBox;
