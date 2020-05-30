module.exports = {
  base: '/blog/',
  dest: 'dist',
  title: '水果派的手记',
  description: 'hello fruit',
  themeConfig: {
    editLinks: false,
    sidebar: [
      {
        title: 'Vue',
        collapsable: true,
        children: [
          ['vue/', '介绍'],
          ['vue/reactive', '响应式']
        ]
      },
      {
        title: 'Vue3',
        collapsable: true,
        children: [
          ['vue3/', 'vue3现状'],
          ['vue3/reactivity', 'vue3的响应式']
        ]
      },
      {
        title: '异步编程',
        collapsable: true,
        children: [
          ['async/', '异步编程模型'],
          ['async/promise', 'promiseA+的规范及实现'],
          ['async/eventloop', '事件循环'],
        ]
      },
      {
        title: '编程思想',
        collapsable: true,
        children: [
          ['paradigm/', '编程范式'],
          ['paradigm/functional', '函数式编程']
        ]
      },
    ]
  }
}