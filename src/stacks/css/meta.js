// Name is a brand and stays as is; description and activity are translated (stacks.css, activities.web).
export const cssStackMeta = {
  id: 'css',
  name: 'CSS',
  activity: 'web',
  dataUrl: new URL('./data.json', import.meta.url).href,
  localeUrl: (locale) => new URL(`./locales/${locale}.json`, import.meta.url).href,
  runtimeLoader: () => import('./runtime.js'),
}
