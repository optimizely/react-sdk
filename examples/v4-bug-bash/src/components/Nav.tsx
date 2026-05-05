'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const SECTIONS = [
  {
    title: 'Provider',
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
    title: 'Hooks',
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
    links: [
      { href: '/rendering/ssr-sync', label: 'SSR Sync' },
      { href: '/rendering/ssr-async', label: 'SSR Async' },
      { href: '/rendering/rsc', label: 'RSC' },
    ],
  },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="nav">
      <Link href="/" className="nav-logo">
        V4 Bug Bash
      </Link>

      {SECTIONS.map((section) => (
        <div key={section.title} className="nav-section">
          <h3 className="nav-section-title">{section.title}</h3>
          <ul className="nav-list">
            {section.links.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={`nav-link ${pathname === link.href ? 'nav-link-active' : ''}`}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
