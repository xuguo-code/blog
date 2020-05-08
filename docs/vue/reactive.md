### Reactive

* 什么是响应式？

当我们想要去剖析一个东西的时候，首先应该先了解它是什么，有什么优势；于是这第一个问题便顺应而生。
从VUE框架的表现来看，响应式是指，当我们在VUE代码中进行合法的对Data中数据操作时，这会直接映射到视图层也就是Dom的更改，中间这个自动化的过程便是响应式，它是实时的自动的。

在VUE的中对于响应式对象的实现是通过数据劫持的方式来做的；那么如何实现一个数据被劫持的响应式对象呢？

答案是`object.defineProprety`

* 数据劫持

  通过`Object.defineProprety`可以实现对对象现有属性的劫持列如：

  ```javascript
  let data = {};
  let value = '';
  Object.defineProprety(data, 'key', {
  	get() {
      console.log('获取key')
      return value;
    },
    set(newValue) {
      console.log('设置key')
      value = newValue;
    }
  });
  ```

  



