## Vue3
> Vue3.0的beta版本在前不久正式发布了，这一举动说明Vue3自身已经稳定了，剩下的事情就是更新生态、修复bug；对于我们而言也是可以开始学习Vue3的最佳时机，提前熟悉不迷路。

#### Vue3的主要变更

1. 包管理采用monorepo的方式，将核心库拆分成complier、runtime以及reavtivity；自带Tree Sharking的功效，不仅如此在合理的分包下扩展变得解耦和源码阅读效率都大大提升。
2. 拆分出来的reactivity包暴露了所有的Vue3响应式功能的函数，使得[Composition API](https://composition-api.vuejs.org/zh/)成为现实。
3. 虚拟Dom静态标记优化更加彻底，实现Block树的概念，为Dom Diff提供了最小的静态单元；实现了仅仅对比一个Block中的动态部分，动态标记达到了属性级别，渲染效率提升2~3倍。
4. Custom Render API的实现，彻底解耦了核心Vdom和render，划分成了平台无关的runtime-core包含所有vue关于Dom的核心功能，浏览器渲染拆成runtime-dom包实现render阶段的浏览器平台相关内容；这使得Vue3的跨平台扩展性有了巨大提升，第三方平台更方便扩展出新的平台接口，而不用将代码耦合在runtime-core中。

