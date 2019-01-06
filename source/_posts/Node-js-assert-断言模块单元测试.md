title: '[Node.js] assert 断言模块单元测试'
catalog: true
author: 姚飞亮
tags:
  - Node.js
categories:
  - Node.js
date: 2019-01-07 00:55:00
subtitle:
header-img:
---
# Node.js assert 断言模块单元测试

在nodejsh中有一个assert模块，这个模块主要用于内部断言测试使用，我们也可以在项目中使用assert模块进行断言的判断。 
如果是true则测试通过，如果是false则测试不通过。 
那么这和用if进行判断调试有什么区别呢？
> 程序一般情况下分为Debug和Release，Debug用于内部测试，Release用于用户使用。

**assert**
> 断言仅在Debug版本起作用和宏一样，它用于检查不应该发生的情况。如果断言失败，则程序会终止。（如果if那Release时还得删掉用于调试的代码）

**if**
> 表达式的值为真则执行当前语句，否则不执行。if既可以用于判断一条语句；也可以判断复合语句。

**区别**
> 1. if判断语句，如果条件为真，则进行下一条语句；如果条件不为真，执行相反的语句 
> 2. assert,断言不成立时，直接终止 
> 3. if用于检测代码的正确性；assert检测代码的合法性，若断言失败，程序就不能运行

**言归正传，还是来看看assert模块的使用，首先先引入断言assert模块**
```
var assert = require('assert');
```
## 1.assert(value, message), assert.ok(value, [message]) 

```
//判断中值是否为true
assert.ifError(value) //测试值是否不为 false，当为 true 时抛出。常用于回调中第一个 error 参数的检查。
var a = 0;
assert(a,'这里需要值为true'); 　　//AssertionError: 这里需要值为true
assert.ok(a,'这里也要为true');　　// AssertionError: 这里也要为true

```

 

## 2.assert.fail(actual, expected, message, operator) 

```
//抛出异常,有message时显示message，没有使用operator作为为分隔符
var a = 0;
assert.fail(a,1,'a！=1','<'); // AssertionError: a！=1
assert.fail(a,2,'','<');　　　　// AssertionError: 0 < 2
```

## 3.assert.equal(actual, expected, [message])   

```
//("=="判断)是否相等 相反：notEqual
　assert.strictEqual(actual, expected, [message])  //("==="判断)是否相等 相反：notStrictEqual

复制代码
var a = 2;
var a='2';

assert.equal(a,b,'a,b不相等 ==')
assert.notEqual(a,b,'a,b相等')　　　　　　// AssertionError: a,b相等
assert.strictEqual(a,b,'a,b不完全相等 ===')  // AssertionError: a,b不完全相等 ===

```

## 4.assert.deepEqual(actual, expected[, message])
```
// 是否深度匹配  相反： notDeepEqual
var buf1 = new Buffer('abc');
var buf2 = new Buffer('abc');

assert.strictEqual(buf1, buf2, 'buf1和buf2不一样');  //AssertionError: buf1和buf2不一样
assert.notDeepEqual(buf1, buf2, 'buf1和buf2一样');  //AssertionError: buf1和buf2一样

```
## 5.assert.throws(block, [error], [message]) 
```
//声明一个block用于抛出错误，'error'可以是构造函数，验证函数或者正则表达式

assert.doesNotThrow(block, [message])//声明模块不抛出错误

复制代码
//构造函数
assert.throws(
  function() {
    throw new Error("Wrong value");
  },
  Error
);

//正则
assert.throws(
  function() {
    throw new Error("Wrong value");
  },
  /value/
);

//自定义错误
assert.throws(
  function() {
    throw new Error("Wrong value");
  },
  function(err) {
    if ( (err instanceof Error) && /value/.test(err) ) {
      return true;
    }
  },
  "unexpected error"
);

```