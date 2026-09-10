import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';

const THEME_COLORS: Record<'light' | 'dark', string> = {
  light: '#ffffff',
  dark: '#1b1b1d',
};

function getTheme(): 'light' | 'dark' {
  return document.documentElement.getAttribute('data-theme') === 'light'
    ? 'light'
    : 'dark';
}

function applyThemeColor(): void {
  const meta =
    document.querySelector<HTMLMetaElement>('meta[name="theme-color"]') ??
    (() => {
      const el = document.createElement('meta');
      el.name = 'theme-color';
      document.head.appendChild(el);
      return el;
    })();
  meta.content = THEME_COLORS[getTheme()];
}

if (ExecutionEnvironment.canUseDOM) {
  applyThemeColor();

  new MutationObserver(applyThemeColor).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
}
