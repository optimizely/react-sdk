function highlightCode(code: string): string {
  return code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/(\/\/.*)/g, '<span class="code-comment">$1</span>')
    .replace(
      /\b(const|let|var|import|from|export|function|return|await|async|new|true|false|null|undefined)\b/g,
      '<span class="code-keyword">$1</span>'
    )
    .replace(/(&#39;[^&#39;]*&#39;|`[^`]*`)/g, '<span class="code-string">$1</span>')
    .replace(/('[^']*'|`[^`]*`)/g, '<span class="code-string">$1</span>');
}

interface ScenarioLayoutProps {
  title: string;
  description: string;
  code?: string;
  children: React.ReactNode;
}

export function ScenarioLayout({ title, description, code, children }: ScenarioLayoutProps) {
  return (
    <div className="scenario">
      <h1 className="scenario-title">{title}</h1>
      <p className="scenario-description">{description}</p>
      <div className="scenario-content">{children}</div>
      {code && (
        <details className="scenario-code" open>
          <summary>
            <strong>Code</strong>
          </summary>
          <pre>
            <code dangerouslySetInnerHTML={{ __html: highlightCode(code) }} />
          </pre>
        </details>
      )}
    </div>
  );
}
