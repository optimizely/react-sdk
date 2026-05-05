interface ScenarioLayoutProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export function ScenarioLayout({ title, description, children }: ScenarioLayoutProps) {
  return (
    <div className="scenario">
      <h1 className="scenario-title">{title}</h1>
      <p className="scenario-description">{description}</p>
      <div className="scenario-content">{children}</div>
    </div>
  );
}
