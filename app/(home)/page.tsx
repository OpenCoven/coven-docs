import Link from 'next/link';
import { Icon } from '@iconify/react';
import { CopyButton } from './CopyButton';
import { BoundarySigil } from './BoundarySigil';
import { RevealDismiss } from './RevealDismiss';
import platformData from '@/content/data/platforms.json';
import s from './home.module.css';

// One screen, no scroll: the thesis and install command stay in view, and
// detail opens as a panel laid over the page (see .reveal in home.module.css)
// instead of pushing it down. Each reveal is a native <details> sharing one
// name, so only one is open at a time.
const REVEAL_GROUP = 'home-reveal';

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

// "Runs on …" comes from the platform list derived from upstream release
// metadata (content/data/platforms.json), never from hand-written copy.
const osLabels: Record<string, { label: string; icon: string }> = {
  macos: { label: 'macOS', icon: 'ph:apple-logo' },
  linux: { label: 'Linux', icon: 'ph:linux-logo' },
  windows: { label: 'Windows', icon: 'ph:windows-logo' },
};
const supportedOses = [...new Set(platformData.platforms.map(({ os }) => os))].filter((os) => os in osLabels);

function CloseButton() {
  return (
    <button type="button" className={s.revealClose} data-reveal-close aria-label="Close">
      <Icon icon="ph:x" width={16} aria-hidden="true" />
    </button>
  );
}

export default function HomePage() {
  const installCommand = 'npm install -g @opencoven/cli && coven doctor';

  return (
    <div className={s.homeMain}>
      <RevealDismiss />

      <section className={s.stage} aria-labelledby="home-title">
        <span className={s.stageGlow} aria-hidden="true" />
        <div className={s.stageText}>
          <p className={s.heroEyebrow}>Local infrastructure for coding agents</p>
          <h1 id="home-title" className={s.heroTitle}>
            <span className={s.heroTitleLine}>Choose the harness.</span>
            <span className={`${s.heroTitleLine} ${s.heroTitleAccent}`}>
              Keep the record<span className={s.recordMark}>.</span>
            </span>
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
              <Icon icon="ph:github-logo-duotone" width={16} aria-hidden="true" />
              <span className={s.compactLabel}>GitHub</span>
            </Link>
          </div>
          <div className={s.install}>
            <span className={s.installPrompt} aria-hidden="true">$</span>
            <span className={s.installCommand} translate="no">{installCommand}</span>
            <CopyButton text={installCommand} />
          </div>

          <div className={s.heroMeta}>
            <p className={s.platforms}>
              <span className={s.platformsLabel}>Runs on</span>
              {supportedOses.map((os) => (
                <span key={os} className={s.platform}>
                  <Icon icon={osLabels[os].icon} width={13} aria-hidden="true" />
                  <span className={s.compactLabel}>{osLabels[os].label}</span>
                </span>
              ))}
            </p>

            <details data-reveal name={REVEAL_GROUP} className={s.why}>
              <summary className={s.whySummary}>
                What Coven owns
                <Icon icon="ph:plus" width={13} className={s.revealIcon} aria-hidden="true" />
              </summary>
              <div className={`${s.reveal} ${s.whyPanel}`}>
                <CloseButton />
                <p className={s.revealEyebrow}>The layer around the agent</p>
                <p className={s.whyCopy}>
                  Harnesses own models and provider authentication. Coven owns what should
                  remain consistent around them: <span>scope</span>, <span>lifecycle</span>, and <span>evidence</span>.
                </p>
                <p className={s.revealText}>
                  A small, local control plane that makes agent work governable without replacing the agent you choose.
                </p>
                <h2 className={s.revealTitle}>Run one session. Keep the evidence.</h2>
                <p className={s.revealText}>Install Coven, verify a harness, and launch from the project you want to protect.</p>
                <div className={s.revealLinks}>
                  <Link href="/docs/guide/getting-started" className={s.revealLink}>
                    Read the guide <Icon icon="ph:arrow-right-bold" width={13} />
                  </Link>
                  <Link href="/docs/guide/ecosystem" className={s.revealLink}>
                    See the ecosystem <Icon icon="ph:arrow-right-bold" width={13} />
                  </Link>
                </div>
              </div>
            </details>
          </div>
        </div>

        <div className={s.stageSigil}><BoundarySigil /></div>
      </section>

      <section className={s.band} aria-labelledby="home-band-title">
        <h2 id="home-band-title" className={s.srOnly}>The layer around the agent</h2>
        {features.map((feature) => (
          <details key={feature.title} data-reveal name={REVEAL_GROUP} className={s.tile}>
            <summary className={s.tileSummary}>
              <span className={s.tileTag}>{feature.tag}</span>
              <span className={s.tileTitle}>{feature.title}</span>
              <Icon icon="ph:plus" width={13} className={s.revealIcon} aria-hidden="true" />
            </summary>
            <div className={`${s.reveal} ${s.tilePanel}`}>
              <CloseButton />
              <p className={s.revealEyebrow}>{feature.tag}</p>
              <h3 className={s.revealTitle}>{feature.title}</h3>
              <p className={s.revealText}>{feature.desc}</p>
              <Link href={feature.href} className={s.revealLink}>
                Read the docs <Icon icon="ph:arrow-right-bold" width={13} />
              </Link>
            </div>
          </details>
        ))}
      </section>
    </div>
  );
}
