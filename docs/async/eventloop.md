#### 事件循环

* **前言**

本文将分别介绍浏览器环境和Node环境下的事件循环，涉及到宏任务、微任务以及**`requestAnimationCallback`**和**`requestIdleCallback`**的行为方式，能帮助你理解更多JavaScript运行时的异步特性。

* **事件循环模型**

一段来自[MDN](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/EventLoop)对于事件循环实现的解释：

```js
while (queue.waitForMessage()) {
  queue.processNextMessage();
}
```

事件循环一般会伴随这一个主进程的恒为`true`的死循环，然后向任务队列不断地寻求新的任务并执行，然后再等待新的任务到来。当然实际情况是会复杂得多，但是一切的一切都是基于这样的模型来构建的。

#### 简单的模型建立

```js
function bar() {
  console.log('bar')
}
function foo() {
  console.log('foo')
  bar()
}

foo()
```

面对这样一段待执行的代码，浏览器首先需要去执行它，我们忽略掉一系列的变量声明、赋值、提升等等内容，直接到达最后一行`foo()`的调用，我们首先会将`foo`函数推入执行函数栈中，类似下图：

>  ![stack](/blog/stack.jpg)
>
> 执行遇到`console.log`也会将其推入执行栈中，如图：
>
> ![stack](/blog/console-in.jpg)
>
> `console.log`执行完毕后，会将其从栈中推出：
>
> ![stack](/blog/console-out.jpg)
>
> 遇到`bar()`也是同样的操作：
>
> ![stack](/blog/bar-in.jpg)
>
> 直到`foo`函数执行完出栈

这是同步代码的简单执行，似乎也什么特别之处，但是如果遇到异步的任务呢？这时候就会出现异步队列的概念了，如下的一段代码：

```js
function bar() {
  console.log('bar')
}
function foo() {
  setTimeout(() => {
    console.log('foo')
  }, 100)
  bar()
}

foo()
```

我们将`foo`函数中的`console`用`setTimeout`包裹起来，这样就形成了一个异步的任务；当执行到foo函数内部的时候会调用栈会形成什么样的结构呢？

> ![Async-loop](/blog/async-loop.jpg)
>
> 如上图所示在遇到异步任务时，会将任务交由浏览器的Web API层处理，这与JavaScript执行所在的进程并非同一个，这样JavaScript便可以直接执行后续任务，不用关心异步任务的调度，浏览器的API层会在异步任务到期的时候将任务回调推入异步任务队列中，而JavaScript的主线程实现了类似MDN描述的事件循环，在当前执行栈清空时会去向异步任务队列取新的任务执行，这样便构建了一个简单的异步任务模型。

#### 微观上的任务队列

在浏览器事件循环的任务队列中实际上是将任务划分成了macrotask（宏任务）和microtask（微任务）具体的API层面表现为：

> 宏任务： script代码 I/O setTimeout setInterval setImmediate(node环境)
>
> 微任务： Promise.then() process.nextTick(node环境) MutaionObserver

任务类型不同也决定了异步任务的推入执行队列的顺序；在整个事件循环基本可以分为以下几个步骤：

> 1. 从宏任务队列头部取出一个macrotask执行（遇到微任务添加至微任务队列，timer添加至宏任务队列）
> 2. 当宏任务执行完，清空microtask队列（如果在执行micro任务时，执行到micro任务会添加到本次microtask任务队列中，即出现微任务的递归调或者耗时间较长的任务用时会阻塞下一个宏任务的执行）
> 3. GUI渲染
> 4. 回到步骤1，直至宏任务队列结束

我们可以将1-4完整的一次执行定义为浏览器的一帧，从描述上可以基本了解到宏任务与微任务的区别：

1. 宏任务是每一帧执行一次，在当前宏任务执行中遇到新的宏任务是会放在下一帧执行的。
2. 微任务是执行发生在当前帧宏任务执行完成后，并且在微任务中添加微任务是会造成阻塞的。
3. GUI渲染并不是在每一帧都会发生的这和浏览器的调度有很大的关系。

接下来通过简单的代码来验证的：

* 执行顺序

```js
setTimeout(() => {
  console.log('3')
}, 0)
new Promise((resolve, reject) => {
  console.log('1')
  resolve(2)
}).then(res => {
	console.log(res)
})
//-----res-----
//1
//2
//3
```

上述代码片段描述了微任务、宏任务的执行顺序。

* 宏任务循环添加不会阻塞渲染和下帧执行

```js
function loop() {
  setTimeout(() => {
    console.log('time')
    loop()
  }, 1000)
}
loop()
//----res----
//time : n
```

在浏览器中执行这段代码并不会阻塞浏览器的交互以及渲染，这也证明了：宏任务执行中添加宏任务会在下一帧执行。

* 微任务循环添加会阻塞事件循环

```js
function loop() {
  Promise.resolve(1).then(() => {
    console.log('promise')
    loop()
  })
}
loop()
//---res---
// promise : n
```

将这段代码放在浏览器中执行后，页面将会无法响应任何操作了 ，这证明了微任务的行为方式：如果在执行micro任务时，执行到micro任务会添加到本次microtask任务队列中，微任务循环添加是会阻塞事件循环的。

#### **`requestAnimationFrame`**

[**`window.requestAnimationFrame()`**](https://developer.mozilla.org/zh-CN/docs/Web/API/Window/requestAnimationFrame)告诉浏览器——你希望执行一个动画，并且要求浏览器在下次重绘之前调用指定的回调函数更新动画。该方法需要传入一个回调函数作为参数，该回调函数会在浏览器下一次重绘之前执行。

```js
let div = document.getElementById('id')
let left = 0

function animation() {
  if(left < 101) {
    div.style.left = `${left}px`
    left += 10
    requestAnimationFrame(animation)
  }
}

requestAnimationFrame(animation)
```

基本的使用方式如上，`requestAnimationFrame`是发生在浏览器下次绘制执行之前，也就是在上文的GUI渲染之前、微任务执行之后，这个时间节点。也是伴随着每一帧的执行，需要做一个完整的动画还得伴随这一个递归的回调函数。  

当然setTimeout也是可以完成功能的，但是`requestAnimationFrame`的优势在于完全交由浏览器调度，能够保证足够的帧率以及浏览器tab切换时自动暂停等特性。

#### **`requestIdleCallback`**

**`window.requestIdleCallback()`**[**`window.requestIdleCallback()`**](https://developer.mozilla.org/zh-CN/docs/Web/API/Window/requestIdleCallback)方法将在浏览器的空闲时段内调用的函数排队。这使开发者能够在主事件循环上执行后台和低优先级工作，而不会影响延迟关键事件，如动画和输入响应。函数一般会按先进先调用的顺序执行，然而，如果回调函数指定了执行超时时间`timeout`，则有可能为了在超时前执行函数而打乱执行顺序。

```js
requestIdleCallback(IdleDeadline => {
  if(IdleDeadline.timeRemaining() > 0 || IdleDeadline.didTimeout) {
    console.log('idle time: ', IdleDeadline.timeRemaining())
  }
}, { timeout: 500 })
```

可见将任务交由**`requestIdleCallback`**来执行，是会发生在浏览器一帧中的空闲时间还足够的情况下，如果浏览器很忙是会被延误的，同时也可以设置timeout来到期强制执行，当然如果浏览器不够时间而产生了超时执行是会拉长浏览器一帧时间的，这样就会让浏览器的渲染产生卡顿，而且在**`requestIdleCallback`**中也不适合再度执行dom操作因为**`requestIdleCallback`**发生在浏览器完成当前帧渲染之后的空闲时间来执行，如果操作dom是会导致浏览器重绘或者回流，在**`requestIdleCallback`**中也是不适合之心`Promise.then`这种微任务的，由于`Promise.then`优先级较高，会在**`requestIdleCallback`**执行完成后立马执行，也是会拉长浏览器一帧时间的。  

在**`requestIdleCallback`**中是和执行一些微小化的任务，类似React的fiber结构这样颗粒度的遍历，是很容易做到及时让出执行权给浏览器的。

```js

let tasks = [
  () => {
    sleep(200)
    console.log('任务一')
  },
  () => {
    sleep(200)
    console.log('任务二')
  },
  () => {
    sleep(200)
    console.log('任务三')
  },
]

function run(deadline) {
  console.log(`本帧剩余时间：${deadline.timeRemaining()}`)
  while((deadline.timeRemaining() > 0 || deadline.didTimeout) 
          && tasks.length > 0) {
    work()
  }
  if(tasks.length > 0) {
    requestIdleCallback(run, { timeout: 1000 })
  }
}

function work() {
  tasks.shift()()
  console.log('执行完毕')
}

function sleep(delay) {
  for(let start = Date.now(); Date.now() - start < delay; ){}
}

requestIdleCallback(run, { timeout: 1000 })
//-----res-----
//本帧剩余时间：24.360000000000003
// 任务一
// 执行完毕
// 本帧剩余时间：49.915
// 任务二
// 执行完毕
// 本帧剩余时间：49.97500000000001
// 任务三
// 执行完毕
```

当我将每个任务睡眠200ms时一帧内是无法完成三个任务的，这三个任务也分别分配到了三帧中执行。

####  Node中的event loop

node中的事件循环大致分成以下几个模块组成：

```js
   ┌───────────────────────────┐

┌─>│           timers          │

│  └─────────────┬─────────────┘

│  ┌─────────────┴─────────────┐

│  │     pending callbacks     │

│  └─────────────┬─────────────┘

│  ┌─────────────┴─────────────┐

│  │       idle, prepare       │

│  └─────────────┬─────────────┘      ┌───────────────┐

│  ┌─────────────┴─────────────┐      │   incoming:   │

│  │           poll            │<─────┤  connections, │

│  └─────────────┬─────────────┘      │   data, etc.  │

│  ┌─────────────┴─────────────┐      └───────────────┘

│  │           check           │

│  └─────────────┬─────────────┘

│  ┌─────────────┴─────────────┐

└──┤      close callbacks      │

   └───────────────────────────┘
```

- ***定时器***：本阶段执行已经被 `setTimeout()` 和 `setInterval()` 的调度回调函数。

- ***待定回调***：执行延迟到下一个循环迭代的 I/O 回调。

*  ***idle, prepare***：仅系统内部使用。

- ***轮询***：检索新的 I/O 事件;执行与 I/O 相关的回调（几乎所有情况下，除了关闭的回调函数，那些由计时器和 `setImmediate()` 调度的之外），其余情况 node 将在适当的时候在此阻塞。

- ***检测***：`setImmediate()` 回调函数在这里执行。

- ***关闭的回调函数***：一些关闭的回调函数，如：`socket.on('close', ...)`。

##### Node事件循环的基本流程：

  循环开始于icoming触发的poll阶段（出现两种情况）

  轮询队列不为空：循环执行队列中的任务直至队列清空或者硬件使用达到上限

  轮询队列为空：首先查看有无注册`setImmediate`如果有则切换至check阶段执行setImmediate回调，如果没有则等待回调添加至队列并且立即执行。

  ##### **在node11版本后 队列执行宏任务与微任务的方式更改为与浏览器相似的，每执行完一次宏任务变清空当前微任务队列；之前则是在每次阶段切换时清空微任务列表。**

  ```js
 setImmediate(() => {
    console.log('imme1')
    Promise.resolve().then(() => {
	     console.log('pro1')
    })
 })

 setImmediate(() => {
    console.log('imme2')
    Promise.resolve().then(() => {
      console.log('pro2')
    })
 })
  ```

  ![image-20200106161724273](/blog/node-10-11.png)

  不同版本node执行的结果证明了这一点。setImmediate应属于两个在poll轮询队列的宏任务。

* setImmediate与prosecc.nextTick不同

  setImmediate是将回调添加至当前任务队列的队尾，而process.nextTIck是将回调添加至当前执行栈的最尾。nextTick总是优先于setImmediate执行，由于nextTick是在添加在当前执行栈尾，所以在嵌套使用时候会出现阻塞当前执行栈之后其他任务的执行。

* setImmediate和setTimeout区别

  两者执行时间都在poll轮询阶段清空轮询队列之后，具体时间点在于setTimeout的回调时间，假如在系统启动执行poll阶段时timer已经可以执行则执行timer再执行setImmediate,

```js
  setTimeout(() => {
    console.log('timer')
  },0)

  setImmediate(() => {
    console.log('setImmediate')
  })
```

  此代码输出取决于程序运行至poll阶段是否需要1ms,如果需要则timer-->setImmediate

  但是如果是event loop在执行时已经ready，如将这段代码放置在I/O操作的回调中执行则只会输出setImmediate-->timer。

  所以timer所设置的时间只是系统在尽量接近设定时间去执行并非准确时间，这取决于poll阶段轮询队列耗时。