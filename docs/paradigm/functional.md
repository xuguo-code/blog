### 初探函数式编程

#### 前言

函数式编程在React推出Hooks、Vue3定稿Composition API后，对于前端来说似乎变成了迫在眉睫的事情，那么到底什么是函数式编程呢，它与前端MVVM框架的关系又是什么？本文将为你解答函数式的基本思想以及在现阶段的React、Vue大环境下如何体现函数式的意义。

#### 什么是函数

在了解函数式编程之前，应该先搞清楚函数是什么

> 函数：分为传统定义和现代定义，在传统定义上主要是指基于运动层面的定义，在现代的定义是指集合层面；函数一般形为：`y = f(x)`x指的是定义域也就是自变量的集合、y指的是值域即因变量的集合、而f则是定义域和值域的对应规则或者说映射关系。

上面是来自数学上的定义，为什么在讲JavaScript的函数式编程却要先将数学上函数定义先讲一遍？因为函数式编程是基于数学函数和它的基本思想的。  

那么JavaScript函数与数学函数有何区别?

```js
// 函数1
var precent = 5
var tax = value => value/100 * (100 + precent)

// 函数2
var tax = (value, precent) => value/100 * (100 + precent)
```

上面两个函数都是计算税率的函数，而它们有什么不同呢？函数1在数学意义上应该是不能被称为真正的函数，因为在数学定义上定义域到值域的对应法则时发生在函数本身上的，它不应该依赖外部的值；从函数1到函数2我们仅仅是消除了函数本身对于外部变量的依赖，这样就完成了一个真正意义上的函数。  

这样做的意义又是什么呢？答案也很简单，刚刚说到函数式编程是基于数学函数和它的思想的，所以我们在完成函数式编程的时候应该创建数学意义上的函数；进而我们能得到函数式编程的初步定义：它是一种编程范式，我们能够依据它创建出仅依赖输入就能完成自身逻辑的函数。  

书写数学意义上的函数有什么优势呢？这样的函数保证了每次被调用时只要保证输入相同就可以得到相同的结果，这样的函数更容易被测试、缓存以及并发运行。

#### 一个概念：**引用透明**

函数对于相同输入都将返回相同的值，函数的这一个属性被称作**引用透明**。也就意味着我们在函数的计算过程中可以直接将引用透明的函数替换掉，如下：

```js
sum(1,2) + Math.max(4,5,6)
----->
3 + Mathc.max(4,5,6)
```

sum的作用是计算参数之和，它是可以被它所返回的值进行替换的；这也就意味着缓存成为了可能，函数的预测性也会变得更好，测试代码也就更加好书写。如计算斐波那契数列的时候缓存是可以带来极大的性能提升的：

```js
// 尾递归实现
function fibonacci(n) {
  if(n === 1) {
    return 1
  }
  if(n === 2) {
    return 2
  }
  return fibonacci(n - 1) + fibonacci(n - 2)
}

// 加上缓存
let fibonacciByMeomoy = (function() {
  let memo = {}
  return fibonacci(n) {
    let res = memo[n]
    if(typeof res === 'number') return res
    res = fibonacci(n - 1) + fibonacci(n - 2)
    memo[n] = res
    return res
  }
})()
```

计算斐波拉契数列的函数是符合引用透明的，所以函数是符合替换模型的，这也就能让我们放心的进行缓存以及重复计算的时候进行缓存值替换，这便是函数式编程的哲学。

#### 一个主张：**声明式与抽象**

函数式编程主张的是声明式编程与编写抽象代码。如何理解这两点？

* 声明式编程

要理解声明式编程需要将命令式编程拿出来对比一下：

```js
// 命令式
let arr = [1,2,3]
for(let i = 0; i < arr.lenght; i ++) {
  console.log(arr[i])
}
// 声明式
arr.forEach(v => console.log(v))
```

命令式的程序每一行都在告诉程序应该怎么做，最终所有的指令组合起来便成为了一个程序行为；但是声明式的程序在做的事情只是告诉程序我们需要做什么；这期中最大的区别便在于关注点在于传递的是"怎么做"还是"做什么"？  

那么在声明式的编程中，具体的指令在哪里呢？具体的指令在`forEach`函数中实现，这其实就引发了函数式的另一个主张就是以抽象的方式创建函数，这些代码能在其他地方被重用。这也及时函数式编程的行为方式：以抽象的方式编写可重用的函数，并且对外部提供声明式的函数接口。

#### 函数式编程的优势所在——纯函数

在上文我们提到过**引用透明**的概念，其实再理解起来纯函数也并不麻烦，纯函数是对给定输入返回相同输出的函数。像之前的求斐波那契数列的函数。这一类函数拥有以下这些特性：

* 可测试性强

> 当代码保持纯函数输入输出的映射特性时，在编写测试代码时也就得到了最小的测试单元并且当我对纯函数进行测试时，是不依赖外部环境的；也就意味着函数的结果是可预测的，也就能预测到期望返回值与真实返回值进行比对测试。

* 可信度高的代码

> 什么是可信度高的代码？`Math.max(2,3,4)`像是`Math.max`仅仅从命名就可以判断出函数的能力，而且可以相信`max`返回的永远会是输入的参数集合中最大的值。这便是纯函数带来的可信度。

* 可缓存

> 可缓存的特性在上面的缓存版本斐波拉契数列中有体现。

#### 高阶函数与闭包

1. 闭包在JavaScript中是一个非常常见的概念了，简而言之闭包指的就是一个内部函数，特别的就是这个内部函数持有的作用域链：

```js
function outer() {
  function inner() {
  }
}
```

inner函数便是一个闭包了，它能访问到outer函数的作用域，这是非常强大的一点。  

2. 而高阶函数（high-order function）的定义则更加简单：一个函数接受另一个函数作为参数并且/或者返回另一个函数。  

那么高阶函数与闭包又有什么奇妙之处呢?  

当我们在处理了JavaScript类型检测函数时可能会做类似的封装：

```js
function isType(type, target) {
	return typeof target === type
}

isType('number', 1)
```

这样写没有什么不对的，但是当我们需要多次判断某一类型时，会发现我们在重复一些代码，如：

```js
isType('number', 1)
isType('number', 3)
isType('number', '1')
```

我们一直在重复传入`'number'`如果能构建一个isNumber的函数便解决这个问题了； 这时候高阶函数就十分适合了;

```js
function isNumber(target) {
  return isType('number', target)
}
```

这便是高阶函数的魅力可以增强一个函数，并且可以编写通用的抽象函数，高阶函数一般都会和闭包相结合，这也是JavaScript强大的能力所致。

#### 组合与管道

当我们在编写纯函数的时候，会发现每个函数的功能都是非常细小而独立的，这种情况当我们需要解决复杂问题的时候，也就可以将复杂功能细小化然后将小函数重组，这是后就会涉及到组合与管道这两个概念。

* 什么是函数式组合

> 将一个函数的输出作为输入，传递给另一个函数的过程就叫做函数式组合；集体到代码的实现如下：
>
> ```js
> // 需求是 将数组中的数字两倍计算一次，再过滤出大于3的数字
> let arr = [1, 2, 3, 4]
> Array.prototype.filter.call(
>   Array.prototype.map.call(arr, v => v * 2), 
>   v => v > 3
> )
> // ---> [4, 6, 8]
> ```
>
> 为了体现`map`输出作为`filter`输入的效果采用了call的方式调用，函数式组合也是体现的十分清晰，但是当如果组合情况变得复杂了，这种时候我们就需要一个能将函数组合的函数--`compose`：
>
> ```js
> function compose(...funcs) {
>   if(funcs.length === 0) return (...args) => args
>   if(funcs.length === 1) return (...args) => funcs[0](args)
>   
>   return funcs.reduce((left, right) => (...args) => left(right(args)))
> }
> ```
>
> `compose`函数做到的是将若干个函数聚合成一个，类似`compose(f1, f2, f3)`--->`(...args) => f1(f2(f3(...args)))`这样的转换过程，这是compose所做的事情，将功能良好的小函数按照从右至左的数量流向聚合成一个函数。

* 什么是管道

在`compose`的基础上，我们总希望函数是按照我们预想的传入顺序来执行的而不是从右至左的数据流向，管道做的事情就是如此：

```js
function compose(...funcs) {
  if(funcs.length === 0) return (...args) => args
  if(funcs.length === 1) return (...args) => funcs[0](args)
  funcs.reverse()
  return funcs.reduce((left, right) => (...args) => left(right(args)))
}
```

> 仅仅需要在聚合之前将函数数组反转即可。

#### 函数curry和偏应用

函数curry和偏应用都是和函数参数相关的概念，所以在真正聊这两个概念前需要了解几个术语：

* 一元函数(unary)

> 只接收一个参数的函数称为一元函数：`x => x + 1`

* 二元函数(binary)

> 只接收两个参数的函数称为二元函数：`(x, y) => x + y`

* 变参函数(variadic)

> 接收可变数量参数的函数称为变参函数

**函数柯里化是将一个多参函数转化成一个嵌套的一元函数的过程。**

接下来将通过一个`add`函数来实现一个柯里化函数：

```js
// 一个计算总和的add函数
let add = (x, y, z) => x + y + z
// 常规调用
add(1, 2, 3)

// 柯里化的调用
// addCurried(1, 2)(3) / addCurried(1)(2, 3)

const curry = fn => {
  return function curriedFn(...args) {
    if(args.length < fn.length) {
			return function() {
        return curriedFn.apply(null, 
								args.concat(Array.from(arguments)))
      }
    }
    return fn.apply(null, args)
  }
}
let addCurried = curry(add)
addCurried(1, 2)(3)
```

通过`args.length < fn.length`来判断是否到达了参数长度，来决定是调用函数还是递归返回继续接收参数的函数，这样就实现了函数的柯里化。通过函数柯里化我们很容易的可以扩展上文的判断类型的函数：

```js
let isTypeCurried = curry(isType)
let isNumber = isTypeCurried('number')
let isString = isTypeCurried('string')
```

这样的扩展方式比起高阶函数的方式，更加抽象了，完全不必为每个不同类型的扩展都去书写一个高阶函数。

**参数流向**

当我们在实现函数柯里化的时候，会发现传入的参数永远都是按照从左至右的顺序来传递的，但是当我们遇到一个这样的需求：

```js
setTimeout(() => console.log('task 1'), 10)
setTimeout(() => console.log('task 2'), 10)
```

我们想要将两个定时器中相同的参数`10ms`提取出来，函数柯里化似乎已经做不到了，这两个函数的共同点是在最右边的参数，我们可能需要先将右侧的参数固化，这样的参数流向和柯里化不同，那么为了解决这个问题就需要用到偏应用了：**偏应用允许我们部分的应用函数参数**

```js
function partial(fn, ...partialArgs) {
  // 捕获预处理参数
  return (...args) => {
    let arg = 0
    let finalArgs = [...partialArgs]
    for(let i = 0; i < partialArgs.length && i < args.length; i ++) {
			if(partialArgs[i] === undefined) {
        finalArgs[i] = args[arg++]
      }
    }
    return fn.apply(null, finalArgs)
  }
}
```

这样就达到捕获预处理参数的作用，我们可以仅关注函数参数的某一个部分。