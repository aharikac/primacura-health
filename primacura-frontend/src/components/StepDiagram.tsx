import { diagrams } from '../data/diagrams';

// A step diagram (SVG generated from primacura-backend/data/diagrams). The SVG is
// our own bundled file, so injecting it is safe; screen readers get the alt text.
export function StepDiagram({ id }: { id: string }) {
  const d = diagrams[id];
  if (!d) return null;
  return (
    <figure className="step-diagram" role="img" aria-label={d.alt}>
      <div aria-hidden="true" dangerouslySetInnerHTML={{ __html: d.svg }} />
    </figure>
  );
}
