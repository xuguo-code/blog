## Vue3的reactivity之reactive和watchEffects

#### 如何使用

vue3对响应式核心被拆分成了reactivity包并且API都采用了函数式的方式暴露，所以需要在对应的包进行引用。

```js
import { reactive, watchEffect } from '@vue/reactivity'
// 创建响应式对象
let state = reactive({ num: 1 })
// 创建副作用
watchEffect(() => console.log(state.num))
// 触发响应式
state.num = 2
```

上面就是Vue3响应式API的核心方法。

#### 有何提升

* Vue3直接将创建响应式对象和创建副作用的功能通过函数的方式暴露，自由度得到了非常大的提升，这也是composition API的基础，对于逻辑的抽离是十分有利的。
* reactive的底层采用了proxy实现，避免了直接对属性的递归、并且支持代理数组、对于新增属性都是有效果的。

#### 如何实现

Vue3的响应式实现与Vue的思路还是大体一致的，但是是采用typescript书写阅读起来还是有一定难度的，所以本文的实现采用纯ES6的方式来实现；在开始书写之前需要一定的前置知识：

* [`Proxy`](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Proxy)
* [`Map`](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Map)
* [`WeakMap`](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/WeakMap)

在了解了这些内容后就可以开始书写了:

1. **创建响应式对象**

```js
// 缓存对象
// 源对象 => 响应式对象
let toProxy = new WeakMap()
// 响应式对象 => 源对象
let toRaw = new WeakMap()

function reactive(target)  {
	// 创建响应式对象
  return createReactiveObject(target)
}

function createReactiveObject(target) {
  // 判断是否为对象类型
  if(typeof target !== 'object' || target == null) {
    console.warn(`target can not be reactive`)
    return target
  }
  // 查询缓存如果是缓存则直接返回已经代理的对象
  let proxyobj = toProxy.get(target)
  if(proxyobj) {
    return proxyobj
  }
  if(toRaw.has(target)) {
    return target
  }

  // 创建
  let observed = new Proxy(target, baseHandler)
  
  // 缓存
  toProxy.set(target, observed)
  toRaw.set(observed, target)
  
  // 返回
  return observed
}
```

> 1. reactive仅需要返回一个通过创建响应式对象函数创建的响应式对象，直接进入到createReactiveObject函数中，首先需要判断，代理的操作仅仅只能对对象生效，基本数据类型可以通过ref来创建响应式对象。
>
> 2. 关于缓存，是为了防止重复代理对象；这里会出现两种情况：  
>
>    1、重复传入已经代理过的原对象   
>
>    2、重复传入已经代理的对象  
>
>    为例应对这两种情况所以需要两个WeakMap进行弱引用的保存，分别保存：  
>
>    原对象 --> 代理后对象  
>
>    代理后的对象 --> 原对象  
>
> 3. 创建代理对象并且进行缓存，最后将此对象返回出去

接下来再看一下`baseHandler`的具体内容：

```js
// 代理对象
let baseHandler = {
  get(target, key) {
    // 获取属性值
    let res = Reflect.get(target, key)
    track(target, key)
    return typeof res === 'object' ? reactive(res) : res
  },
  set(target, key, value) {
    let oldValue = target[key]
    // 设置属性值
    let res = Reflect.set(target, key, value)
    if(Reflect.has(target, key)) {
      // 新增
      trigger(target, key)
    } else {
      // 修改
      if(oldValue !== value) {
        trigger(target, key)
      }
    }
    return res
  }
}
```

>这里的handler为了简化逻辑，仅仅对get和set进行了代理，具体的依赖收集和更新触发可以暂且不看，只需要知道进行收集和触发的时机点即可，待会会主要讲解这两个部分。  
>
>get部分比较简单：在获取值后触发依赖收集，在返回值的时候有一个小细节，判断当前获取的属性值是否为对象然后进行深层代理，因为reactive的初始化默认是浅层代理，这样的方式相比Vue2的`Object.defineProperty`默认就进行递归，效率会高一些。  
>
>set部分：因为proxy可以代理到新增和修改两种set操作，所以这里需要区分一下；通过判断是否原来就已经拥有当前设置key值来区分新增和修改，针对修改的部分需要做一个设置相同值的过滤，这个操作在数组的新增上会十分有效果，因为向数组中添加一个新的值，会触发两次set分别是针对新值的增加和length属性的更新，如果不做区分则会触发两次更新通知，因为在新值的新增发生在length属性的更新之前，在设置新的值成功后，数组的length属性便已经成为了最新的长度，当再次修改length属性时，取出来的旧的length值就已经是最新的长度值了，这就会被修改的判断相等过滤掉，这也就避免了重复触发更新的问题。

2. **track和trigger函数**

* track函数

在讲这两个函数之前需要先建立两个数据结构的概念：

1. activeEffect当前正在运行的副作用函数、effectStack全局的副作用函数栈（每当副作用函数执行首先会将当前副作用函数推入栈中）

2. targetMap结构如下

   ```js
   {
     // 当前响应式对象
     target: {
      // 当前访问key与之对应的依赖列表
       key: deps
     }
   }
   ```

   这里是两层的Map结构，主要存储响应式对象的key分别对应的依赖列表。

有了这两个数据结构的加持就可以将track函数写出：

```js
// 副作用栈
let effectStack = []
let activeEffect = null
// 对象对应key
/**
 * {
 *  target: {
 *      key: deps[]
 *    }
 * }
 */
let targetMap = new WeakMap()

// 依赖收集和派发更新
function track(target, key) {
  if(effectStack.length > 0 || activeEffect !== null) {
    
    let keyToDeps = targetMap.get(target)
    // 查询对象
    if(!keyToDeps) {
      // 没有新建
      targetMap.set(target, keyToDeps = new Map)
    }
    let deps = keyToDeps.get(key)
    if(!deps) {
      keyToDeps.set(key, deps = new Set())
    }
    deps.add(activeEffect)
  }

}
```

> 1、track是在get阶段执行的，所需要的参数是触发的对象和key值  
>
> 2、在函数体中首先需要做的是判断当前副作用函数栈是否为空、调用track收集时是否有副作用函数正在执行  
>
> 3、然后所做就是将当前正在执行的副作用函数，通过targetMap的数据结构存储即可达到收集依赖的效果

* trigger函数

trigger函数所做的事情也是比较简单的，通过target和key在targetMap取出相应的副作用函数列表，然后依次执行。

```js
function trigger(target, key) {
  // 普通副作用函数
  let effects
  let keyToDeps
  if(keyToDeps = targetMap.get(target)) {
    effects = keyToDeps.get(key)
  }
	//	依次执行
  effects && effects.forEach(e => e())
}
```

3. watchEffect函数

watchEffect所做的事情也是很简单的：接收一个函数，然后将普通函数包装成副作用函数并且首次执行一遍。

```js
// 副作用
function watchEffect(fn, options) {
  // 创建副作用函数
  let e = createReactiveEffect(fn, options)
  // 首次执行
  e()
  // 返回
  return e
}

function createReactiveEffect(fn, options) {
  // 真实的副作用函数
  const effect = function reactiveEffect(...args) {
    try {
      // 推入数组
      effectStack.push(effect)
      activeEffect = effect
      return fn(...args)
    } finally {
      // 推出
      effectStack.pop()
      activeEffect = effectStack[effectStack.length - 1]
    }
  }
  effect.options = options
  return effect
}
```

> 1、得到参数fn将fn包装成副作用函数e
>
> 2、执行函数e并且返回函数e
>
> 3、在createReactiveEffect中也比较简单，在执行副作用函数时先将当前副作用函数push到副作用函数栈中并且将当前正在执行副作用的钩子正确指向当前的副作用函数
>
> 4、在当前副作用函数执行完成时，将处于副作用函数栈栈顶的当前已执行完成的副作用函数推出，然后将正在执行副作用函数钩子修正指向即可

#### 完整代码

```js
// vue3 响应式
// 副作用栈
let effectStack = []
let activeEffect = null
// 副作用
function effect(fn, options) {
  // 创建副作用函数
  let e = createReactiveEffect(fn, options)
    // 首次执行
    e()
  // 返回
  return e
}

function createReactiveEffect(fn, options) {
  // 真实的副作用函数
  const effect = function reactiveEffect(...args) {
    try {
      // 推入数组
      effectStack.push(effect)
      activeEffect = effect
      return fn(...args)
    } finally {
      // 推出
      effectStack.pop()
      activeEffect = effectStack[effectStack.length - 1]
    }
  }
  effect.options = options
  return effect
}

// 缓存对象
// 源对象 => 响应式对象
let toProxy = new WeakMap()
// 响应式对象 => 源对象
let toRaw = new WeakMap()

// 代理对象
let baseHandler = {
  get(target, key) {
    let res = Reflect.get(target, key)
    track(target, key)
    return typeof res === 'object' ? reactive(res) : res
  },
  set(target, key, value) {
    let oldValue = target[key]
    let res = Reflect.set(target, key, value)
    if(Reflect.has(target, key)) {
      // 新增
      trigger(target, key)
    } else {
      // 修改
      if(oldValue !== value) {
        trigger(target, key)
      }
    }
    return res
  }
}

function reactive(target) {
  // 创建响应式对象
  return createReactiveObject(target)
}

function createReactiveObject(target) {
  // 判断是否为对象类型
  if(typeof target !== 'object' || target == null) {
    console.warn(`target can not be reactive`)
    return target
  }
  // 查询缓存如果是缓存则直接返回已经代理的对象
  let proxyobj = toProxy.get(target)
  if(proxyobj) {
    return proxyobj
  }
  if(toRaw.has(target)) {
    return target
  }

  // 创建
  let observed = new Proxy(target, baseHandler)
  
  // 缓存
  toProxy.set(target, observed)
  toRaw.set(observed, target)
  
  // 返回
  return observed
}
// 对象对应key
/**
 * {
 *  target: {
 *      key: deps[]
 *    }
 * }
 */
let targetMap = new WeakMap()

// 依赖收集和派发更新
function track(target, key) {
  if(effectStack.length > 0 || activeEffect !== null) {
    
    let keyToDeps = targetMap.get(target)
    // 查询对象
    if(!keyToDeps) {
      // 没有新建
      targetMap.set(target, keyToDeps = new Map)
    }
    let deps = keyToDeps.get(key)
    if(!deps) {
      keyToDeps.set(key, deps = new Set())
    }
    deps.add(activeEffect)
  }

}

function trigger(target, key) {
  // 普通副作用函数
  let effects
  let keyToDeps
  if(keyToDeps = targetMap.get(target)) {
    effects = keyToDeps.get(key)
  }
	// 依次执行
  effects && effects.forEach(e => e())
}
```



#### 总结

Vue3响应式的整体原理和Vue2的一致，只是更改成了更加偏向函数式的实现：

* 在副作用执行阶段依旧是利用了JavaScript单线程的特性来持有当前的副作用函数以达到正确的收集依赖；

* 在代理方面采用Proxy实现了，首次代理免递归、并且巧妙地将深层代理防止在了get阶段，使得初始化以及代理的整体性能提升；
* 在set阶段巧妙的通过过滤新增和修改操作将数组变更的重复触发过滤掉，是值得学习的技巧
* 整体通过几个数据结构的设定完成了大部分缓存和全局状态的功能，也是非常巧妙的实现

