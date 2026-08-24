import Link from 'next/link';
import { Icon } from '@iconify/react';
import { docsSections, getStabilityLabel } from '@/lib/docs-manifest';
import styles from './docs-portal.module.css';

const journey = [
  {
    step: '01',
    title: 'Prepare',
    description: 'Install Coven, verify the local boundary, and connect a harness you already trust.',
    command: 'coven doctor',
    href: '/docs/guide/install',
    icon: 'ph:check-circle-duotone',
  },
  {
    step: '02',
    title: 'Run',
    description: 'Launch one project-scoped session without moving provider credentials into Coven.',
    command: 'coven run',
    href: '/docs/guide/getting-started',
    icon: 'ph:play-circle-duotone',
  },
  {
    step: '03',
    title: 'Inspect',
    description: 'Read the session record, event stream, and logs after the harness exits.',
    command: 'coven sessions',
    href: '/docs/cli/sessions',
    icon: 'ph:record-duotone',
  },
  {
    step: '04',
    title: 'Recover',
    description: 'Diagnose readiness, daemon, project, and harness failures in one ordered path.',
    command: 'coven doctor',
    href: '/docs/reference/troubleshooting',
    icon: 'ph:lifebuoy-duotone',
  },
] as const;

const sectionIcons: Record<string, string> = {
  guide: 'ph:compass-duotone',
  cli: 'ph:terminal-window-duotone',
  harnesses: 'ph:plugs-connected-duotone',
  daemon: 'ph:cpu-duotone',
  'memory-models': 'ph:brain-duotone',
  'coven-code': 'ph:code-duotone',
  openapi: 'ph:brackets-curly-duotone',
  reference: 'ph:book-open-text-duotone',
  experimental: 'ph:flask-duotone',
};

export function DocsPortal() {
  return (
    <div className={styles.portal} data-docs-portal>
      <section className={styles.hero} aria-labelledby="docs-portal-title">
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Canonical Coven runtime manual</p>
          <h2 id="docs-portal-title" className={styles.heroTitle}>
            From install to evidence.
          </h2>
          <p className={styles.heroLead}>
            Start with one recorded coding-agent session, then move outward into the CLI,
            daemon, harness, memory, and local API contracts that make the work durable.
          </p>
          <div className={styles.heroActions}>
            <Link href="/docs/guide/getting-started" className={styles.primaryAction}>
              Run a first session
              <Icon icon="ph:arrow-right-bold" width={15} aria-hidden="true" />
            </Link>
            <Link href="/docs/guide/architecture" className={styles.secondaryAction}>
              Understand the boundary
            </Link>
          </div>
        </div>

        <div className={styles.proof} aria-label="Documentation release signals">
          <div className={styles.proofItem}>
            <strong>{docsSections.length}</strong>
            <span>governed sections</span>
          </div>
          <div className={styles.proofItem}>
            <strong>Hourly</strong>
            <span>production checks</span>
          </div>
          <div className={styles.proofItem}>
            <strong>Daily</strong>
            <span>source-drift checks</span>
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="first-session-path">
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.eyebrow}>First-session path</p>
            <h2 id="first-session-path">Four moves from readiness to recovery</h2>
          </div>
          <p>
            The primary journey stays narrow. Advanced runtime and integration material only
            appears after the first useful loop is complete.
          </p>
        </div>

        <div className={styles.journeyGrid}>
          {journey.map((item) => (
            <Link key={item.step} href={item.href} className={styles.journeyCard}>
              <div className={styles.journeyTopline}>
                <span className={styles.step}>{item.step}</span>
                <Icon icon={item.icon} width={20} aria-hidden="true" />
              </div>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <code>{item.command}</code>
              <span className={styles.cardLink}>
                Open guide <Icon icon="ph:arrow-up-right" width={14} aria-hidden="true" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="contract-map">
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.eyebrow}>Contract map</p>
            <h2 id="contract-map">Choose the surface you need</h2>
          </div>
          <p>
            Every section declares its stability and links to the repository that owns the
            underlying facts.
          </p>
        </div>

        <div className={styles.catalogGrid}>
          {docsSections.map((section) => (
            <Link
              key={section.slug}
              href={`/docs/${section.slug}`}
              className={styles.catalogCard}
              data-stability={section.stability}
            >
              <div className={styles.catalogTopline}>
                <span className={styles.catalogIcon}>
                  <Icon
                    icon={sectionIcons[section.slug] ?? 'ph:file-text-duotone'}
                    width={20}
                    aria-hidden="true"
                  />
                </span>
                <span className={styles.status}>{getStabilityLabel(section.stability)}</span>
              </div>
              <h3>{section.title}</h3>
              <p>{section.searchDescription}</p>
              <span className={styles.source}>Source · {section.sourceRepo}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.releasePanel} aria-labelledby="release-evidence">
        <span className={styles.releaseIcon} aria-hidden="true">
          <Icon icon="ph:seal-check-duotone" width={28} />
        </span>
        <div>
          <p className={styles.eyebrow}>Release evidence</p>
          <h2 id="release-evidence">The public manual ships with the product contract.</h2>
          <p>
            Generated API pages, browser routes, machine-readable exports, deployment commit
            attribution, and upstream source watches are verified independently of the hosting
            provider.
          </p>
        </div>
        <div className={styles.releaseLinks}>
          <Link href="/docs/reference/api">Read the API contract</Link>
          <a href="/build.txt">Inspect deployed commit</a>
          <a href="/llms.txt">Open the agent index</a>
        </div>
      </section>
    </div>
  );
}
