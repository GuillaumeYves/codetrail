export const cssStackMeta = {
  id: 'css',
  name: 'CSS',
  description: 'Visual styling and layout',
  activity: 'Web development',
  runtime: 'web',
  color: '#1572b6',
  mark: '3',
  dataUrl: new URL('./data.json', import.meta.url).href,
  runtimeLoader: () => import('./runtime.js'),
}
