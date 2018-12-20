---
title: "[工具] 网站访问数据统计"
catalog: true
toc_nav_num: true
date: 2018-12-20 10:46:47
subtitle: "统计分析网站访问数据"
header-img: "/img/article_header/article_header.png"
tags:
- 工具
catagories:
- 工具
---

# 网站访问数据统计工具

## google analytics添加跟踪代码实现统计分析

 其代码添加方式共有三种

### gtag.js

```
<!-- Global site tag (gtag.js) - Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=UA-111264922-1"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'UA-11XXX922-1');
</script>
```
事件跟踪代码：https://developers.google.com/analytics/devguides/collection/gtagjs/

### analytics.js

```
<!-- Google Analytics -->
<script>
(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
})(window,document,'script','https://www.google-analytics.com/analytics.js','ga');

ga('create', 'UA-XXXXX-Y', 'auto');
ga('send', 'pageview');
</script>
<!-- End Google Analytics -->
```
事件跟踪代码：

```
onclick="ga('send', 'event', 'Videos', 'play', 'Fall Campaign');"
```
详细信息请查看google文档：
google分析文档
### google代码跟踪管理器GTM


## baidu analytics添加跟踪代码实现统计分析

```
<script>
var _hmt = _hmt || [];
(function() {
  var hm = document.createElement("script");
  hm.src = "https://hm.baidu.com/hm.js?d226c9b2398c493d7d554d7ce7c7f143";
  var s = document.getElementsByTagName("script")[0];
  s.parentNode.insertBefore(hm, s);
})();
</script>
```
d226c9b2398c493d7d554d7ce7c7f143 改为自己的id

#  网站访问数据统计分析 ：
##  一、网站概况：
### 1、跳出率：
   只浏览了一个页面便离开了网站的访问次数占总的访问次数的百分比（入口页面有跳出率、访问页面是退出率）。
跳出率的统计意义：
统计跳出率的高低是网站分析的一个重要指标,通常用于评估网站的用户体验，可以用于指导网站以及页面的改善。跳出率越高就说明该网站对访问者的吸引力越低，当跳出率达到一定的程度时，就说明网站需要做些优化或者页面更新了。
###  2、平均访问时长：
在页面停留时间的总和除以PV（入口页面才有平均时长统计）
### 3、来源网站：
具体某个服务器的数据统计占比（预言：上线之后，券服务的来源网站可能是两个，因为应用部署在2台不同的服务器上了）

## 二、入口页面
从其他服务器访问到券服务页面的第一个URL就是入口页面
预言：上线之后，券服务露出口、预览露出口、系统维护、系统异常等都可能成为入口页面
### 1、浏览量就是PV
### 2、入口页面的UV、IP和网站概况的UV、IP有区别，（例如：在统一浏览器上登陆了2用户，则浏览器Cookie变了，所以IP只有一个，而UV有两个）
### 3、跳出率：
只浏览了一个页面便离开了网站的访问次数占总的访问次数的百分比
### 4、平均访问页数：
每人平均访问的页数，既，浏览量除以UV
### 5、访问次数：
访客对您网站进行访问的次数，是根据访客浏览器和网站服务器之间的互动情况判定。（不同以UV，在百度统计里，以下三种情况会记为新的访问：
1. 访客关闭浏览器后重新进入该网站；
2. 访客不关闭浏览器，但是在该网站上不活动超过30分钟，30分钟后访客再次点击该网站上的链接；
3. 访客任何时候从其他网站到达该网站。）

注：一天之内您网站的独立访客数(以Cookie为依据)，一天内同一访客多次访问您网站只计算1个访客。
疑问：浏览器中Cookie信息时如何保存的？

## 三、受访页面
### 1、浏览量（PV）：
页面被打开的次数，同一页面被打开多次。统计累加（跟入口页面的PV、网站概况的PV没什么区别）
### 2、访客数（UV）：
通过受访页面的URL来统计的，进入同一页面的URL不一样被记为多次UV
### 3、贡献下游浏览量：
该页面给站内其他页面带去的直接浏览量，（站内：表示其他页面也在百度统计之内）
### 4、退出页面次数：
（用户从该页面直接关闭浏览器的次数）
### 5、平均停留时间：
访客浏览某一页面时所花费的平均时长，页面的停留时长=进入下一个页面的时间-进入本页面的时间（只有在受访页面有）。
### 6、入口页次数：
作为访问会话的入口页面（即：入口URL个数）的次数。
### 7、退出率：
退出率=该页面的退出次数/该页面的PV数。
注：
而且退出率也不是根据提示里面的“退出率=该页面的退出次数/该页面的PV数”得出的结果。
退出率，就是根据该页面的退出次数比上PV数（从百度贴吧中拿到的数据）

## 四、流量分析
实时访客（实时访问统计有问题，无法统计在线人数）
IP:入口的服务器IP（目前券服务露出在支付宝内，所以IP是支付宝服务器IP）
趋势分析

## 五、访问分析
跳出率：只浏览了一个页面便离开了网站的访问次数占总的访问次数的百分比

注：在该一栏可以看到访问该服务器的域名

## 六、事件分析
1、事件总数：点击按钮的总数量
2、唯一访客事件数：点击按钮的UV
