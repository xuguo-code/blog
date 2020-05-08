### Reactive

* 什么是响应式？

当我们想要去剖析一个东西的时候，首先应该先了解它是什么，有什么优势；于是这第一个问题便顺应而生。  
从VUE框架的表现来看，响应式是指，当我们在VUE代码中进行合法的对Data中数据操作时，这会直接映射到视图层也就是Dom的更改，中间这个自动化的过程便是响应式，它是实时的自动的。

在VUE的中对于响应式对象的实现是通过数据劫持的方式来做的；那么如何实现一个数据被劫持的响应式对象呢？     

答案是`object.defineProprety`

* 数据劫持

  > 通过`Object.defineProprety`可以实现对对象现有属性的劫持列如：

  ```javascript
  let data = {};
  let value = '';
  Object.defineProprety(data, 'dep', {
  	get() {
      console.log('获取dep')
      return value;
    },
    set(newValue) {
      console.log('设置dep')
      value = newValue;
    }
  });
  ```

  > 这样就能劫持对象相应属性的setter和getter了，对于拦截一整个对象的属那也就只需要对对象的所有key值进行递归设置。

* 依赖收集

  > 首先应该弄清楚依赖是什么？所谓的依赖是指视图层对数据层的依赖如：

  ```html
  <div>{{ dep }}</div>
  ```

  > 在vue中视图层即模板在视图中进行数据绑定就会让视图依赖数据。
  >
  > 依赖的收集则发生在render函数（在vue的mount阶段，vue是只认识render函数的，无论在.vue的单文件中书写template还是其他书写模板的方式最终都会通过vue-loader或者vue的编译器版本编译成render函数）的执行中，因为在render的执行时会访问绑定在视图层的数据，这样就会访问到被劫持的getter，所以依赖收集时发生在getter阶段。
  >
  > 依赖收集本质上是一个发布订阅模式，在getter阶段产生订阅；由于在vue源码中是通过render watche来调度组件的更新的，这边为了贴近vue原本的流程，就需要模拟一个render方法和render watcher：

  ```javascript
  //模拟一个render，产生对dep的依赖
  let render = () => { console.log(data.dep) };
  //模拟一个render watcher
  function Watcher(update) {
    this.update = update;
  }
  ```

  > 有了这两个辅助方法，我们可以专注依赖如何收集；首先我们先构建一个发布订阅模式：

  ```javascript
  // 发布订阅模式
  function Dep() {
    this.watchers = [];
  }
  // 当前全局的watcher
  Dep.target = null;
  // 依赖收集方法
  Dep.prototype.depend = function() {
    this.watchers.push(Dep.target);
  }
  // 派发通知方法
  Dep.prototype.notify = function() {
    this.watchers.forEach(watcher => {
      watcher.update()
    })
  }
  
  ```

  > 因为JavaScript是单线程的，当我们执行某个renderwatcher的update函数的时候，出现在render里面的依赖应该都是当前的watcher；所以可以将当前的watcher赋值给Dep的静态属性上，发布订阅在进行依赖收集的时候就可以正确的收集到依赖watcher。

  ```javascript
  // 模拟执行渲染
  Watcher.prototype.get = function() {
    try{
  //    当前的全局watcher
     	Dep.target = this;
    	this.update();  
    } finally {
  //    收集完毕置空
      Dep.target = null
    }
  }
  ```

* 开始收集和派发更新

  > 有了watcher和发布订阅就可以开始在getter中进行收集和setter中派发更新通知。

  ```javascript
  let data = {};
  let val = '';
  let dep = new Dep();
  Object.defineProperty(data, 'dep', {
    get() {
      // 依赖收集
      dep.depend();
      return val;
    },
    set(newVal) {
      val = newVal;
      // 派发通知
      dep.notify();
    }
  })
  new Watcher(render);
  ```

  