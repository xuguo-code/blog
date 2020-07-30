#### Vue3源码解析之runtime包

##### **前言**

我将在接下来的几篇文章中解析Vue3-runtime包所涉及的相关功能，比如render渲染器的创建、custom render API 是如何设计的、组件的挂载流程、组件的更新流程、diff算法解析等等一系列运行时相关的功能，能帮助你更加了解Vue3的运行机制。基于版本：`3.0.0-rc.4`

##### 目标

本系列文章主要以解析vue的挂载和更新流程为目的，不会涉及到非常细枝末节的部分比如：如何对web平台元素class、style属性的patch等更加细节的内容；考虑到vue3代码容量，顾忌每一个代码分支是会拖缓达到目标的进度的，所以以主要目标为重，原生组件的实现、插槽等等特性可在之后再详细解读。

##### 前置准备

看源码光看肯定是不够的，咱们需要一个好的测试环境，来进行debugger之类的操作，本次我是用的环境是直接在vue-next代码仓库中来运行vue3，这样的话也不用打开两个ide来回切换在源码和运行仓库中；环境准备步骤如下：

> 1. 克隆代码仓库
>    `git clone https://github.com/vuejs/vue-next.git`
>
> 2. 安装依赖
>
>    `npm i`
>
> 3. 修改rollup配置开启生产打包sourceMap
>
>    1、打开项目根目录的rollup.config.js
>    2、找到第83行的   output.sourcemap = !!process.env.SOURCE_MAP
>    3、至设置成   output.sourcemap = true
>
> 4. 打包生成vue3
>
>    `npm run build`
>
> 5. 打开src下的vue文件夹，在examples中新建demo文件夹，在demo中创建一个html如下：

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>vue3</title>
  <script src="../../dist/vue.global.js"></script>
</head>
<body>
  <div id="app"></div>
</body>
<script>
  let { ref } = Vue
  const App = {
    template: `
      <div id="root" @click="add">
        {{ num }}
      </div>
    `,
    setup() {
      let num = ref(0)
      return {
        num
      }
    }
  }

  Vue.createApp(App).mount('#app')
</script>
</html>
```

> 6. vue3的生产源文件存放在examples的同级目录dist下，需要测试即可在源文件中打上debugger
> 7. 直接将demo/index.html在浏览器打开即可

至此关于代码调试的准备已经做完，在下一篇幅中将开始解析vue3渲染器和app的创建过程。