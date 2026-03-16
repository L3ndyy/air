export function ThemeScript() {
  const script = `
    (function() {
      var t = localStorage.getItem('air-theme');
      if (t === 'dark') document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
    })();
  `;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
