import styles from "./landing.module.css";
import { DemoSequence } from "./DemoSequence";

const STEPS = [
  {
    num: "01",
    title: "Create it",
    copy: "Add your name, role, company, photo and contact details. Your card is created and stored on your device.",
  },
  {
    num: "02",
    title: "Keep it close",
    copy: "Add BYZCARD to your Home Screen. Your card is one tap away when you need it.",
  },
  {
    num: "03",
    title: "Show your QR",
    copy: "When you meet someone, open BYZCARD and show them your QR code. They scan it with their phone camera.",
  },
  {
    num: "04",
    title: "They save you",
    copy: "Your card opens in their browser. They can save your details directly to their contacts.",
  },
] as const;

export function HowItWorks() {
  return (
    <section id="how-it-works" className={`${styles.section} ${styles.anchorTarget}`}>
      <div className={styles.container}>
        <div className={styles.sectionHead}>
          <p className={styles.sectionEyebrow}>How it works</p>
          <h2 className={styles.sectionTitle}>Meet. Scan. Save.</h2>
          <p className={styles.lede}>Sharing your card should take seconds.</p>
        </div>
        <div className={styles.stepsFlow}>
          {STEPS.map((step) => (
            <div key={step.num}>
              <p className={styles.stepGhost} aria-hidden="true">
                {step.num}
              </p>
              <h3 className={styles.itemTitle}>{step.title}</h3>
              <p className={styles.itemCopy}>{step.copy}</p>
            </div>
          ))}
        </div>
        <p className={styles.noAppLine}>They don’t need BYZCARD installed.</p>
        <DemoSequence />
      </div>
    </section>
  );
}
