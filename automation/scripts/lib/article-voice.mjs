/** Deterministic helpers for longer, less template-like, professionally framed prose. */

export function hashSeed(value = '') {
  let hash = 0;
  for (const char of String(value)) {
    hash = ((hash << 5) - hash) + char.charCodeAt(0);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function pick(seed, list) {
  return list[seed % list.length];
}

export function pickMany(seed, list, count) {
  if (!list.length) return [];
  const result = [];
  for (let i = 0; i < count; i++) {
    result.push(list[(seed + i * 17) % list.length]);
  }
  return [...new Set(result)];
}

export function annotateOfficialLine(line = '') {
  const text = String(line).trim();
  const lower = text.toLowerCase();
  if (/breaking|deprecated|remove|incompatible|migration/.test(lower)) {
    return '兼容性信号：旧接口/旧配置可能失效，应进入变更影响评估（impact assessment），而不是只做冒烟。';
  }
  if (/security|cve|vulnerab|advisory/.test(lower)) {
    return '安全信号：优先核对受影响组件与暴露面，再决定是热修、灰度还是冻结发布窗口。';
  }
  if (/fix|bug|patch|resolve|hotfix|backport/.test(lower)) {
    return '缺陷修复信号：把条目映射到你们是否复现过同类故障；有则收益高，无则仍建议看回归面。';
  }
  if (/feature|add|introduce|support|enable|new/.test(lower)) {
    return '能力扩展信号：先判断它解决的是产品瓶颈、工程效率还是可观测性，再排优先级。';
  }
  if (/docs|documentation|typo|readme/.test(lower)) {
    return '文档信号：往往意味着官方在澄清契约边界；对接入方，契约比营销句更重要。';
  }
  if (/performance|optimi|speed|memory|latency/.test(lower)) {
    return '性能信号：必须落到你们的基准场景（P95 延迟、构建时长、包体、内存）复测，避免被形容词绑架。';
  }
  return '把它当作待核验的工程信号：回到模块、配置键与调用链，确认是否命中你们的依赖图。';
}

export function sceneForTech(source, seed) {
  const scenes = {
    'Next.js': [
      '假设你维护一个既有营销页又有登录后仪表盘的站点：SSR/静态生成与客户端交互同时存在，任何渲染路径变化都会放大回归成本。',
      '假设预览环境已接入 CI：依赖升级失败会直接阻断合并，这时发布说明就是变更窗口的准入材料。'
    ],
    Kubernetes: [
      '假设集群同时承载无状态服务与有状态组件：控制平面与节点版本偏差、API 弃用和插件兼容会形成连锁约束。',
      '假设你负责平台层 SLA：上游版本一动，工单、容量与回滚演练都要重新对齐。'
    ],
    Angular: [
      '假设仓库处于新旧模块并存期：编译器、模板语义与 TypeScript 版本耦合，升级常表现为“类型/模板错误成片出现”。',
      '假设团队刚统一工具链：框架小版本也可能迫使 CLI、测试与构建插件同步迁移。'
    ],
    webpack: [
      '假设生产构建是发布闸门：Loader/Plugin 钩子或缓存策略一变，最先暴露的是自定义链路与产物差分。',
      '假设本地 HMR 正常但生产包体异常：升级评估必须以产物、日志和关键页面为证据，而不是主观体感。'
    ],
    Babel: [
      '假设你们仍服务一组长尾浏览器：预设、插件和 Polyfill 策略变化会直接改写兼容矩阵与包体积。',
      '假设语法特性用得激进：转译结果与运行时辅助函数一变，需要用集成测试而不是单测幻觉来验收。'
    ],
    Rust: [
      '假设 CI 钉死 toolchain：编译器诊断与 edition/feature 变化会造成“本地绿、流水线红”的典型漂移。',
      '假设业务仓与库仓版本不一致：一次编译器升级可能触发依赖树的连锁 MSRV 问题。'
    ],
    TypeScript: [
      '假设开启严格检查：新版本增量报错常常是类型系统收紧，而不是业务逻辑突然损坏。',
      '假设单体里同时有应用与组件库：模块解析、声明文件与 emit 策略变化会跨包传播。'
    ],
    'Visual Studio Code': [
      '假设团队依赖远程开发与关键扩展：编辑器升级的真实风险在语言服务、调试适配器与扩展 API 兼容。',
      '假设配置通过 Settings Sync 统一：应先小流量验证，再全员推送，避免“共享配置一次性放大故障”。'
    ]
  };
  return pick(seed, scenes[source] || [
    '假设你要把发布放进变更管理流程：关键不是标题，而是影响面、验证证据与回滚条件。'
  ]);
}

export function sceneForIndustry(industry, seed) {
  const scenes = {
    ai: [
      '从交付视角看：模型能力变化会改写提示词资产、评测集、人工复核比例和单位任务成本。',
      '从治理视角看：同一能力若进入生产，就要同步回答数据驻留、审计轨迹、越权调用与供应商锁定。',
      '从组织视角看：AI 发布往往先冲击“谁有权把模型接到业务流程”，而不是先冲击模型榜单分数。'
    ],
    blockchain: [
      '从系统视角看：协议/客户端变更影响最终性假设、手续费市场和运维窗口，行情只是表层噪声。',
      '从风险视角看：要分清是共识层、执行层、应用合约还是托管通道出了问题——层没分清就无法定价风险。',
      '从制度视角看：升级公告与监管文件决定可运营边界，TPS 海报很少决定机构能否上线。'
    ],
    finance: [
      '从宏观传导看：政策利率与流动性条件会进入贴现率、融资成本和风险偏好，再传导到资产价格。',
      '从机构行为看：声明措辞变化会影响银行负债端、信用扩张与美元流动性，而不只是当日指数涨跌。',
      '从风险管理看：专业读法是更新假设与压力情景，而不是把一次会议翻译成交易口号。'
    ]
  };
  return pick(seed, scenes[industry]);
}

export function humanBridge(seed) {
  return pick(seed, [
    '用专业语言概括：',
    '先给结论框架：',
    '若压缩成决策语言：',
    '从工程/制度视角看：',
    '落到可审查的判断：'
  ]);
}

export function closingNote(seed) {
  return pick(seed, [
    '专业阅读的终点不是立场站队，而是留下可复盘的假设、证据与验证计划。',
    '你可以直接反对我的权重分配，但请把反对写成可检验命题——那才是研究，而不是情绪。',
    '链接负责溯源，框架负责迁移：下次遇到同类发布，你应能复用同一套问题清单。',
    '若读完后你能说清“影响哪一层、谁该负责、如何证伪”，这篇文章才算完成交付。'
  ]);
}

export function professionalTechDepth(source, seed, item) {
  const frameworks = {
    'Next.js': {
      layers: '路由与渲染路径（SSR/SSG/ISR/客户端）、数据获取与缓存、构建产物与部署适配、开发服务器与可观测性',
      risks: '渲染语义漂移、缓存键失效、中间件/鉴权顺序变化、与 React/Node 运行时版本耦合',
      metrics: 'TTFB、关键路由成功率、构建时长、冷启动、错误率、缓存命中率'
    },
    Kubernetes: {
      layers: '控制平面、节点与运行时、API/CRD、网络与存储插件、工作负载调度与发布策略',
      risks: '版本偏差、API 弃用、准入控制器与策略冲突、插件兼容、滚动升级中的容量塌陷',
      metrics: 'API server 延迟、调度失败、节点 NotReady、重启风暴、HPA 行为、错误预算消耗'
    },
    Angular: {
      layers: '编译器与模板、变更检测、路由与表单、CLI/构建、测试与 TypeScript 对齐',
      risks: '模板语义变化、DI 与库不兼容、迁移schematics覆盖不足、严格模板检查带来的存量债务暴露',
      metrics: '构建错误数、首屏可交互、包体、E2E 失败率、类型错误收敛速度'
    },
    webpack: {
      layers: '模块图构建、Loader/Plugin 管线、代码分割与缓存、DevServer、产物优化',
      risks: '钩子行为变更、持久化缓存失效、source map/tree-shaking 差异、自定义扩展脆断',
      metrics: '冷/热构建时长、产物体积、重复依赖、运行时 chunk 错误、CI 缓存命中'
    },
    Babel: {
      layers: '语法解析、变换插件、预设目标矩阵、辅助函数/Polyfill、与打包器集成',
      risks: '目标环境误配、重复 Polyfill、插件顺序问题、与 TypeScript/JSX 管道冲突',
      metrics: '产物体积、兼容性用例、运行时 ReferenceError、转换耗时'
    },
    Rust: {
      layers: '编译器前端/中端/后端、标准库、cargo 工具链、lint/测试、跨平台目标',
      risks: 'MSRV 提升、诊断更严导致的存量警告转错误、依赖 edition 不一致、CI 镜像漂移',
      metrics: '编译时长、测试通过率、clippy 债务、二进制体积、关键基准吞吐'
    },
    TypeScript: {
      layers: '类型检查器、模块解析、声明文件生态、emit 与工具链（tsc/babel/swc）协同',
      risks: '隐式 any 暴露、lib/DOM 类型变化、路径映射失效、复合项目引用断裂',
      metrics: '类型错误增量、检查耗时、下游包编译失败、编辑器语言服务稳定性'
    },
    'Visual Studio Code': {
      layers: '编辑器核心、语言服务、扩展主机、调试适配、远程/容器开发链路',
      risks: '扩展 API 不兼容、语言服务回归、远程连接中断、团队配置同步放大故障',
      metrics: '扩展激活失败、调试启动成功率、远程会话稳定性、关键工作流耗时'
    }
  };
  const f = frameworks[source] || {
    layers: '接口契约、运行时行为、构建/发布流水线、可观测性与回滚路径',
    risks: '隐性破坏性变更、依赖耦合、验证覆盖不足、回滚不可执行',
    metrics: '错误率、延迟、构建成功率、关键用户路径完成率'
  };
  const lens = pick(seed, [
    '建议用“控制面 / 数据面 / 工具面”三分法阅读本次发布：控制面是默认行为与配置契约，数据面是运行时输入输出，工具面是 CLI/CI/可观测性。',
    '建议用变更管理语言处理：触发条件、影响资产、验证证据、回滚触发器、沟通对象。缺任何一项，都不该称为“已评估”。',
    '建议先画最小依赖图：谁直接依赖该版本，谁间接受构建产物/类型声明/插件影响。影响评估的质量取决于图的完整度。'
  ]);
  return {
    frameworkIntro: lens,
    layers: f.layers,
    risks: f.risks,
    metrics: f.metrics,
    secondOrder: pick(seed, [
      `二阶效应上，${source} 的一次发布常常改变的不是单点功能，而是团队的验证成本曲线：补丁越多，越要自动化；破坏性越强，越要缩短反馈环。`,
      `二阶效应上，若发布说明大量出现安全与兼容词，短期会抬升冻结窗口与代码审查强度；若大量出现性能与开发体验词，则更可能改变产能预期与技术债偿还节奏。`,
      `二阶效应上，版本标签（${item.tagName}）只是索引；真正决定组织反应速度的，是你们有没有可复用的回归资产与明确的“不升级”条件。`
    ]),
    breadth: pick(seed, [
      `放到生态坐标里看：${source} 很少孤立存在。它上接语言/运行时，下接 CI、部署与可观测性，横向还有替代方案与兼容层。选型或升级时，应同时问“跟”和“不跟”的机会成本。`,
      `广度上至少对照三件事：上游（语言/框架/OS）、平行替代（同类工具）、下游消费者（业务应用与平台用户）。只看单一仓库的 changelog，会低估系统性风险。`,
      `专业对比不只看功能清单，而看契约稳定性、迁移工具成熟度、社区修复速度与锁定成本。对 ${source} 而言，这些往往比单次版本的亮点列表更能决定是否跟进。`
    ])
  };
}

export function professionalIndustryDepth(industry, seed, event) {
  const table = {
    ai: {
      structure: '能力层（模型/工具调用）→ 交付层（API/产品/权重）→ 治理层（安全、隐私、审计）→ 组织层（流程改写与人机分工）',
      incentives: '供应商竞争的是能力、价格、延迟与生态锁定；买方优化的是任务成功率、单位成本、合规可审计与退出期权。',
      constraints: '评测外推有限、幻觉与越权、数据驻留与版权、供应链依赖（模型/插件/向量库/网关）。',
      breadth: '向上看算力与云配额，向下看应用工作流，横向看开源权重与闭源 API 的替代弹性，以及监管对高风险场景的要求。',
      questions: [
        '该能力进入生产后，谁拥有提示词/数据/评测资产？',
        '失败模式是拒答、胡答还是越权操作？各自的人工兜底是什么？',
        '成本模型按 token、按座还是按任务？敏感分析阈值在哪里？',
        '供应商切换成本是否被架构显式降低（路由、抽象层、双轨评测）？'
      ]
    },
    blockchain: {
      structure: '共识与最终性 → 执行/客户端 → 数据可用性与扩容 → 应用合约/钱包 → 托管与法币通道',
      incentives: '协议侧追求安全与去中心化权衡；应用侧追求费用、吞吐与开发速度；中介侧追求合规与资产管理规模。',
      constraints: '客户端多样性、升级协调、MEV/手续费机制、跨链桥风险、司法辖区与披露要求。',
      breadth: '同一事件可能同时冲击：节点运营商、L2/应用开发者、做市与托管、以及传统金融的产品通道（如 ETF/支付）。',
      questions: [
        '变更落在哪一层？是否改变最终性或信任假设？',
        '用户资产托管关系变了吗？密钥与赎回路径是否仍清晰？',
        '不升级的最坏兼容后果是什么？升级失败如何回滚？',
        '监管或交易所规则是否把它从“技术事件”变成“可交易/可上架事件”？'
      ]
    },
    finance: {
      structure: '政策工具（利率/QE/QT/流动性设施）→ 金融条件 → 信用与资产价格 → 实体融资与支出 → 反馈到通胀与就业',
      incentives: '央行优化通胀与就业（及金融稳定）；财政关注偿债与增长；市场参与者交易的是预期差而非声明原文。',
      constraints: '数据依赖、传导时滞、财政货币互动、跨境资本流动、沟通带来的预期管理。',
      breadth: '一次沟通常联动：债市收益率曲线、美元流动性、信用利差、风险资产估值，以及银行体系的负债成本。',
      questions: [
        '声明改变的是路径（forward guidance）还是当下工具设定？',
        '哪些指标被提高权重：通胀粘性、就业降温，还是金融稳定？',
        '对本组织，影响的是贴现率、融资可得性，还是合规摩擦？',
        '哪些假设需要写入下一次预算/风控会议，而不是写入交易群口号？'
      ]
    }
  };
  const f = table[industry];
  return {
    structure: f.structure,
    incentives: f.incentives,
    constraints: f.constraints,
    breadth: f.breadth,
    questions: f.questions,
    diagnosis: pick(seed, [
      `对「${event.title}」做专业诊断时，先定位它主要改写的是结构、激励，还是约束。三者抓错，后续讨论会全程错位。`,
      `我会把 ${event.source_name} 的公开信息先放进“可验证事实 / 机制解释 / 尚未证实的外推”三箱。只有第一箱能直接进决策材料。`,
      `专业读法强调可证伪：你要能指出，若两周后哪个观察指标没出现，就应削弱当前解释的权重。`
    ])
  };
}
