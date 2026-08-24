import Link from 'next/link';
import { Icon } from '@iconify/react';
import { CopyButton } from './CopyButton';
import { BoundarySigil } from './BoundarySigil';
import s from './home.module.css';

type Feature = {
  title: string;
  desc: string;
  href: string;
  tag: string;
};

const features: Feature[] = [
  {
    title: 'Harness freedom',
    desc: 'Run the coding CLI you already trust. Coven leaves provider credentials and model choice with that harness.',
    href: '/docs/harnesses',
    tag: 'choice',
  },
  {
    title: 'Project boundaries',
    desc: 'The local daemon verifies the project root and working directory before it launches a session.',
    href: '/docs/harnesses/project-roots',
    tag: 'control',
  },
  {
    title: 'Durable sessions',
    desc: 'Keep a replayable event record across process exits, then attach, archive, or remove it deliberately.',
    href: '/docs/cli/sessions',
    tag: 'record',
  },
  {
    title: 'Local API',
    desc: 'Build your own local client against the versioned socket contract without bypassing the authority boundary.',
    href: '/docs/reference/api',
    tag: 'integrate',
  },
];

function FeatureGrid({ features }: { features: Feature[] }) {
  return (
    <div className={s.fg}>
      {features.map((feature) => (
        <Link key={feature.title} href={feature.href} className={s.fc}>
          <span className={s.fcEyebrow}>{feature.tag}</span>
          <div className={s.fcTitleRow}>
            <span className={s.fcTitle}>{feature.title}</span>
            <span className={s.fcArrow}><Icon icon="ph:arrow-right" width={14} /></span>
          </div>
          <p className={s.fcDesc}>{feature.desc}</p>
        </Link>
      ))}
    </div>
  );
}

export default function HomePage() {
  const installCommand = 'npm install -g @opencoven/cli && coven doctor';

  return (
    <div className={s.homeMain}>
      <section className={s.heroPanel}>
        <div className={s.heroText}>
          <p className={s.heroEyebrow}>Local infrastructure for coding agents</p>
          <h1 className={s.heroTitle}>
            Choose the harness.<br />
            <span className={s.heroTitleAccent}>Keep the record.</span>
          </h1>
          <p className={s.heroLead}>
            Coven is the local runtime around your coding agent: project boundaries,
            supervised sessions, durable event history, and a stable local API.
          </p>
          <div className={s.heroActions}>
            <Link href="/docs/guide/getting-started" className={s.heroButtonPrimary}>
              Start a session <Icon icon="ph:arrow-right-bold" width={14} />
            </Link>
            <Link href="https://github.com/OpenCoven/coven" target="_blank" className={s.heroButtonSecondary}>
              <Icon icon="ph:github-logo-duotone" width={16} /> GitHub
            </Link>
          </div>
        </div>
        <div className={s.heroSigil}><BoundarySigil /></div>
      </section>

      <section className={s.introSection}>
        <div className={s.introText}>
          <p className={s.introCopy}>
            Harnesses own models and provider authentication. Coven owns what should
            remain consistent around them: <span>scope</span>, <span>lifecycle</span>, and <span>evidence</span>.
          </p>
          <div className={s.installBar}>
            <div className={s.installBadge}><Icon icon="ph:terminal-window-duotone" width={14} /> npm</div>
            <div className={s.installCommand}>{installCommand}</div>
            <CopyButton text={installCommand} />
          </div>
        </div>
      </section>

      <section className={s.featureSection}>
        <div className={s.sectionHead}>
          <h2 className={s.sectionTitle}>The layer around the agent</h2>
          <p className={s.sectionLead}>A small, local control plane that makes agent work governable without replacing the agent you choose.</p>
        </div>
        <FeatureGrid features={features} />
      </section>

      <section className={s.ctaSection}>
        <h2 className={s.ctaTitle}>Run one session. Keep the evidence.</h2>
        <p className={s.ctaLead}>Install Coven, verify a harness, and launch from the project you want to protect.</p>
        <div className={s.ctaActions}>
          <Link href="/docs/guide/getting-started" className={s.ctaPrimary}>Read the guide <Icon icon="ph:arrow-right-bold" width={14} /></Link>
          <Link href="/docs/guide/ecosystem" className={s.ctaSecondary}>See the ecosystem <Icon icon="ph:arrow-right-bold" width={14} /></Link>
        </div>
      </section>
    </div>
  );
}
