### Vue2.x--Reactive

* **什么是响应式？**

从VUE框架的表现来看，响应式指的是在vue程序中当我们更改数据时，视图同步更新的，并且是不需要我们手动干预的；这里的从数据到视图自动更新的过程就是响应式的体现。由此可见数据是重点，如何知道数据更新了和如何知道视图使用到了哪些数据就成了主要问题，我们首先解决如何知道数据更新了这个问题。

1. **如何知道数据更新了**

要想知道数据是否更新了，可以通过ES5中的[`object.defineProprety`](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty)来做，这个API是可以设置对象对应的属性的getter和setter的这正好满足了知道数据更新了这个需求。

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

  ```javascript
  function observer(target) {
    // 如果是基本类型就返回 --- 递归终止条件
    if(typeof target !== 'object' || target == null) {
      return target
    }
    // 如果是对象则开始劫持
    for(key in target) {
      defineReactive(target, key, target[key])
    }
  }
  
  function defineReactive(target, key, value) {
    // 深度监听嵌套对象
    observer(value)
  
    Object.defineProperty(target, key, {
      get() {
        console.log('设置', key)
        return value
      },
      set(newVal) {
        if(newVal !== value) {
          console.log(`设置${key}为${newVal}`)
          value = observer(newVal)
        }
      }
    })
  }
  ```

  > 通过简单的递归就可以拦截到整个对象现有属性的getter和setter，当我修改任意一个值的时候都会console对应的日志出来，这就是已经劫持了当前对象了。

* 如何劫持数组

  > 对于数组不能通过`Object.defineProprety`来劫持，但是可以通过对数组方法重写来达到目的，实现如下：

  ```javascript
  // 保存原始原型
  let oldPrototype = Array.prototype
  // 创建一个原型指向数组原型的空对象
  let newPrototype = Object.create(oldPrototype)
  // 待劫持的方法
  let methods = ['push', 'pop', 'shift', 'unshift']
  // 遍历重写方法
  methods.forEach(method => {
    Object.defineProperty(newPrototype, method, {
      value: function(...args) {
        // 调用原来的方法
        let res = oldPrototype[method].call(this, ...args)
        // 做劫持操作
        console.log('劫持数组', method)
        return res
      },
      configurable: false,
      writable: false
    })
  })
  
  ```

  2. **如何知道视图依赖了哪些数据**

现在我们已经劫持到了数据的变更和获取了，剩下的问题就是找到视图依赖的数据，然后进行收集；这个过程比较繁琐，让我们先来看看VUE是如何做的：

![reactive](/blog/reactive.png)

因为重点在响应式，我们可以将watcher和virtual Dom的概念弱化，暂且理解这里的watcher就是对应一个组件持有一个的渲染观察者，他掌管着组件渲染的调度权，这里的组件渲染可以理解成调用组件的render函数（在vue的mount阶段，vue是只认识render函数的，无论在.vue的单文件中书写template还是其他书写模板的方式最终都会通过vue-loader或者vue的编译器版本编译成render函数)生成virtual dom。  

现在关注点来到图上描述的流程：

> 1. 首次渲染会对于数据产生访问，则会触发数据的getter函数
>
> 2. 在getter函数中会将watcher当做依赖收集起来
>
> 3. 在下次数据更新是就会通知依赖watcher去重新执行render函数

现在已经很明确整个响应式的流程了，在getter中收集依赖、在setter中派发通知，现在需要解决的就是如何收集依赖和派发通知如何来做。

* 观察者模式

  > 收集依赖和派发通知听起来很难理解，其实本质上是一个观察者模式。
  >
  > **观察者模式** 在软件设计中是一个对象，维护一个依赖列表，当任何状态发生改变自动通知它们。
  >
  > 实现如下：

  ```javascript
  // 观察者模式
  function Dep() {
    this.watchers = [];
  }
  // 依赖收集方法
  Dep.prototype.depend = function(fn) {
    this.watchers.push(fn);
  }
  // 派发通知方法
  Dep.prototype.notify = function() {
    this.watchers.forEach(watcher => {
      watcher.update()
    })
  }
  ```

  > 如果每一个数据的每一个属性都持有一个观察者，在watcher执行响应组件的render函数时候访问到了对应属性的getter时就可以将watcher当做依赖添加到观察者的依赖列表中，这样就实现了依赖收集；setter新的属性值时就直接通知观察者去通知依赖列表的watcher去执行对应的render函数重新渲染。按照现在的思路可以将`defineReactive`修改成如下：

  ```javascript
  function defineReactive(target, key, value) {
    observer(value)
    // 为每个属性提供一个依赖观察者
    let dep = new Dep()
    Object.defineProperty(target, key, {
      get() {
        // 收集watcher
        dep.depend()
        return value
      },
      set(newVal) {
        if(newVal !== value) {
          value = observer(newVal)
          // 通知watcher重渲染
          dep.notify()
        }
      }
    })
  }
  ```

  > 可以注意到这里的depend没有传递任何参数过去供观察者收集，那这里是如何实现的呢？

  > 因为JavaScript是单线程的，当我们执行某个渲染watcher的render函数的时候，出现在render里面访问到数据的属性的依赖应该都是当前的watcher；所以可以将当前的watcher赋值给Dep的静态属性上，进行依赖收集的时候就可以正确的收集到依赖watcher，render函数执行完了则将这个Dep的全局静态属性给清空就行了。

  ```javascript
  // 发布订阅模式
  function Dep() {
    this.watchers = []
  }
  // 当前全局的watcher
  Dep.target = null
  //....省略代码
  //模拟一个render watcher
  function Watcher(update) {
    this.update = update
    this.get()
  }
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

  > 这里就利用了JavaScript单线程的特性，在update执行的时候维持住当前watcher在全局的唯一性，从而达到正确收集依赖的目的。

  **完整代码**

  ```javascript
  //模拟一个render watcher
  function Watcher(update) {
    this.update = update
    this.get()
  }
  // 模拟执行渲染
  Watcher.prototype.get = function() {
    try{
     	Dep.target = this
    	this.update()  
    } finally {
      Dep.target = null
    }
  }
  
  // 发布订阅模式
  function Dep() {
    this.watchers = []
  }
  // 当前全局的watcher
  Dep.target = null
  // 依赖收集方法
  function hasOwn(origin, newOne) {
    let res = origin.findIndex(oldOne => oldOne === newOne)
    return res > -1 ? true : false
  }
  Dep.prototype.depend = function() {
    hasOwn(this.watchers, Dep.target) ? '' : this.watchers.push(Dep.target)
  }
  // 派发通知方法
  Dep.prototype.notify = function() {
    this.watchers.forEach(watcher => {
      watcher.get()
    })
  }
  
  // 响应式
  let oldPrototype = Array.prototype
  let newPrototype = Object.create(oldPrototype)
  let methods = ['push', 'pop', 'shift', 'unshift']
  methods.forEach(method => {
    Object.defineProperty(newPrototype, method, {
      value: function(...args) {
        let res = oldPrototype[method].call(this, ...args)
        console.log('劫持数组', method)
        return res
      },
      configurable: false,
      writable: false
    })
  })
  
  
  function observer(target) {
    if(typeof target !== 'object' || target == null) {
      return target
    }
    if(Array.isArray(target)) {
      Object.setPrototypeOf(target, newPrototype)
      target.forEach(val => {
        observer(val)
      })
    } else {
      for(key in target) {
        defineReactive(target, key, target[key])
      }
    }
  }
  
  function defineReactive(target, key, value) {
    observer(value)
    let dep = new Dep()
    Object.defineProperty(target, key, {
      get() {
        dep.depend()
        return value
      },
      set(newVal) {
        if(newVal !== value) {
          value = observer(newVal)
          dep.notify()
        }
      }
    })
  }
  let data = {
    a: 1,
    b: 2
  }
  
  observer(data)
  
  
  
  //模拟一个render，产生对dep的依赖
  let render = () => { console.log(`依赖于data的a属性：${data.a}`) }
  let render2 = () => { console.log(`依赖于data的b属性：${data.b}`) }
  new Watcher(render)
  new Watcher(render2)
  
  setTimeout(() => {
    data.a = '修改了a'
  }, 2000)
  setTimeout(() => {
    data.b = '修改了b'
  }, 4000)
  ```

  > 打印结果：
  >
  > 依赖于data的a属性：1
  >
  > 依赖于data的b属性：2
  >
  > 依赖于data的a属性：修改了a （2s后打印）
  >
  > 依赖于data的b属性：修改了b（4s后打印）

3. **为什么需要理解响应式原理？**

这个问题的答案可能很大一部分是来自面试的压力，现在越来越多的公司面试会涉及到vue的响应式原理，很好的掌握vue的响应式原理的确会对面试有很大的帮助；但是我们学习一个新的知识点的时候，应该尽量多的挖掘知识点背后能为我们带来的价值，仅仅就应对面试这一点吗？显然不是的，下面我会总结几点。

1. 更好的了解vue的运行机制

   > 响应式是vue的核心库所做的事情，在了解响应式原理前提下就更加接近了解vue的运行机制；能够知道vue是如何从数据渲染到视图、如何响应式的更新视图这会帮助你更好的理解vue的数据驱动思想，毕竟写出符合vue设计逻辑的代码才会对书写业务代码有更大的帮助；同时vue的响应式原理也是阅读vue源码的一块敲门砖，只有在理解了响应式的实现原理才有可能真的去读懂vue的整个生命周期、更新周期，才能将编译模块、运行时更新模块串联起来。

2. 扩展设计模式、基础知识运用的场景

   > 上文在讲解依赖收集的部分时也讲解了一个观察者模式以及怎么通过`defineProperty`来构建响应式对象；这都是源码才能告诉我技巧，设计模式是非常抽象的代码通用套路，学习起来似懂非懂但是真的要在业务中用起来确实无从下手的，通过源码的学习就可以很直观的体会到设计模式是如何在自然地嵌入到代码中的；更多的JavaScript语言层面的技巧也不用多说了，可以看到很多API是如何在大牛手中运用的，像vue响应式这样巧妙的代码设计也是让人体会最多的部分。同时vue中也蕴藏着更多的知识例如：编译模块对于编译原理的运用、解析模板时运用的正则与栈结构、vdom diff算法对树形结构的递归、组件化部分的配置合并策略等等内容都是值得学习的知识点。