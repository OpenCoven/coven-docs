import data from '@/content/data/platforms.json';

type Product = 'cli' | 'coven-code';

/**
 * The platforms Coven ships for, rendered from content/data/platforms.json
 * (derived from upstream release metadata, so it never drifts from what is
 * published). The reader's platform row is highlighted, never hidden: a
 * matrix is a reference.
 *
 *   <PlatformMatrix />                      native CLI packages
 *   <PlatformMatrix product="coven-code" /> Coven Code release archives
 */
export function PlatformMatrix({ product = 'cli' }: { product?: Product }) {
  const rows = data.platforms.filter((platform) => (product === 'cli' ? platform.cli : platform.covenCode));

  return (
    // Same wrapper Fumadocs gives Markdown tables, so the matrix reads as one.
    <div className="relative overflow-auto prose-no-margin my-6">
      <table>
        <thead>
          <tr>
            <th>Platform</th>
            {product === 'cli' ? (
              <>
                <th>OS/CPU</th>
                <th>Native package</th>
              </>
            ) : (
              <th>Archive</th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((platform) => (
            <tr key={platform.id} data-platform-row={`${platform.id} ${platform.os}`}>
              <td>{platform.label}</td>
              {product === 'cli' ? (
                <>
                  <td>
                    <code>{platform.cli?.node}</code>
                  </td>
                  <td>
                    <code>{platform.cli?.package}</code>
                  </td>
                </>
              ) : (
                <td>
                  <code>{platform.covenCode?.archive}</code>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
