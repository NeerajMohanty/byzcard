import styles from "./landing.module.css";

const CASES = [
  { title: "Students", copy: "Career fairs, networking events and introductions." },
  {
    title: "Professionals",
    copy: "Keep your contact details ready without carrying paper cards.",
  },
  { title: "Freelancers", copy: "Share your work and contact information quickly." },
  {
    title: "Small businesses",
    copy: "Give customers a simple way to save your details.",
  },
  { title: "Events", copy: "Use the digital card or print a 4 × 6 networking badge." },
  {
    title: "Creators",
    copy: "Share the details that matter when meeting people offline.",
  },
] as const;

export function UseCases() {
  return (
    <section className={`${styles.section} ${styles.sectionAlt}`}>
      <div className={styles.container}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Made for whoever you’re meeting next.</h2>
        </div>
        <div className={styles.featureGrid}>
          {CASES.map((useCase) => (
            <div key={useCase.title} className={styles.featureCard}>
              <h3 className={styles.featureTitle}>{useCase.title}</h3>
              <p className={styles.featureCopy}>{useCase.copy}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
