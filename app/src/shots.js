// Fixed scenes for screenshots: ?shot=editor shows the page with a sample
// photo; ?shot=cover shows the cover alone, filling the viewport.
// `photo` picks the hero sample (samples/<photo>.jpg) and `caption` the title.
// window.__shotReady is set once the fonts are in and the cover is painted.
export async function runShot(shot, query, hooks) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  if (shot === 'editor') document.body.classList.add('shot-editor');
  const photo = query.get('photo') ?? 'pier';
  const caption = query.get('caption') ?? 'VICE TIDE';
  await hooks.apply(photo, caption);
  await hooks.ensureFonts();
  hooks.redraw();
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
