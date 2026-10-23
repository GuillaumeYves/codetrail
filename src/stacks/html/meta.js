export const htmlStackMeta = {
  id: 'html',
  name: 'HTML',
  description: 'Semantic page structure',
  activity: 'Web development',
  runtime: 'web',
  color: '#e34f26',
  mark: '5',
  dataUrl: new URL('./data.json', import.meta.url).href,
  runtimeLoader: () => import('./runtime.js'),
}
