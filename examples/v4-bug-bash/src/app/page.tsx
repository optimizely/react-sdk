import Link from 'next/link';

const SECTIONS = [
  {
    title: 'Provider Behavior',
    description: 'Tests provider configurations, ODP, forced decisions, and client scoping.',
    links: [
      { href: '/provider/01-user-datafile', label: '01 User + Datafile' },
      { href: '/provider/02-user-datafile-sdkkey', label: '02 User + Datafile + SDK Key' },
      { href: '/provider/03-user-sdkkey-only', label: '03 User + SDK Key Only' },
      { href: '/provider/04-odp-skip-segments', label: '04 ODP Skip Segments' },
      { href: '/provider/05-odp-qualified-segments', label: '05 ODP Qualified Segments' },
      { href: '/provider/06-odp-fetch-segments', label: '06 ODP Fetch Segments' },
      { href: '/provider/07-multiple-providers', label: '07 Multiple Providers' },
      { href: '/provider/08-forced-decision', label: '08 Forced Decisions' },
      { href: '/provider/09-module-level-client', label: '09 Module-Level Client' },
      { href: '/provider/10-component-level-client', label: '10 Component-Level Client' },
    ],
  },
  {
    title: 'Hook Functionality',
    description: 'Tests all decision hooks — sync, async, CMAB, holdout, ODP, UPS.',
    links: [
      { href: '/hooks/use-decide', label: 'useDecide' },
      { href: '/hooks/use-decide-holdout', label: 'useDecide (Holdout)' },
      { href: '/hooks/use-decide-odp-vuid', label: 'useDecide (ODP+VUID)' },
      { href: '/hooks/use-decide-odp-no-vuid', label: 'useDecide (ODP no VUID)' },
      { href: '/hooks/use-decide-for-keys', label: 'useDecideForKeys' },
      { href: '/hooks/use-decide-all', label: 'useDecideAll' },
      { href: '/hooks/use-decide-async-cmab', label: 'useDecideAsync (CMAB)' },
      { href: '/hooks/use-decide-async-ups', label: 'useDecideAsync (UPS)' },
      { href: '/hooks/use-decide-for-keys-async', label: 'useDecideForKeysAsync' },
      { href: '/hooks/use-decide-all-async', label: 'useDecideAllAsync' },
      { href: '/hooks/use-client', label: 'useOptimizelyClient' },
      { href: '/hooks/use-user-context', label: 'useOptimizelyUserContext' },
    ],
  },
  {
    title: 'Rendering',
    description: 'Tests SSR sync, SSR async, and React Server Components.',
    links: [
      { href: '/rendering/ssr-sync', label: 'SSR Sync' },
      { href: '/rendering/ssr-async', label: 'SSR Async' },
      { href: '/rendering/rsc', label: 'RSC' },
    ],
  },
];

export default function Dashboard() {
  return (
    <div className="dashboard">
      <h1>V4 Bug Bash</h1>
      <p>Optimizely React SDK v4 — comprehensive test scenarios</p>

      {SECTIONS.map((section) => (
        <div key={section.title} className="dashboard-section">
          <h2>{section.title}</h2>
          <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.75rem' }}>{section.description}</p>
          <div className="dashboard-grid">
            {section.links.map((link) => (
              <Link key={link.href} href={link.href} className="dashboard-card">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
