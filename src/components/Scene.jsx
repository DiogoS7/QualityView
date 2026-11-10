/**
 * Deep-navy backdrop (styles in index.css) with one soft cobalt light at the top and a
 * faint grid, so the glass has something to blur without competing with the data.
 */
export default function Scene() {
  return (
    <div className="scene" aria-hidden="true">
      <div className="glow glow-cobalt" />
      <div className="grid-lines" />
      <div className="vignette" />
    </div>
  );
}
