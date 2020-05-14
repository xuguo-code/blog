module.exports = {
  base: '/blog/',
  dest: 'dist',
  title: '水果派的手记',
  description: 'hello fruit',
  themeConfig: {
    editLinks: false,
    sidebar: [
      {
        title: 'VUE',
        collapsable: true,
        children: [
          ['vue/', '介绍'],
          ['vue/reactive', '响应式']
        ]
      }
    ]
  }
}