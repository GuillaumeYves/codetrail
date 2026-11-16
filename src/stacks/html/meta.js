// Name is a brand and stays as is; description and activity are translated (stacks.html, activities.web).
export const htmlStackMeta = {
  id: 'html',
  name: 'HTML',
  activity: 'web',
  dataUrl: new URL('./data.json', import.meta.url).href,
  localeUrl: (locale) => new URL(`./locales/${locale}.json`, import.meta.url).href,
  runtimeLoader: () => import('./runtime.js'),
}
