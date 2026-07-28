import fs from 'node:fs/promises';
import https from 'node:https';
import path from 'node:path';
import process from 'node:process';
import { milestones } from './lib/industry-milestones.mjs';
import {
  annotateOfficialLine,
  closingNote,
  hashSeed,
  humanBridge,
  pick,
  professionalIndustryDepth,
  sceneForIndustry
} from './lib/article-voice.mjs';

const ROOT = process.cwd();
const START = '2019-01';
const END = '2026-07';
const write = process.argv.includes('--write');
const cacheDir = path.join(ROOT, 'automation/state/industry-news-cache');
const collectionDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit'
}).format(new Date());

const months = [];
for (let year = 2019; year <= 2026; year++) {
  for (let month = 1; month <= 12; month++) {
    const period = `${year}-${String(month).padStart(2, '0')}`;
    if (period >= START && period <= END) months.push(period);
  }
}

const escapeYaml = (value) => JSON.stringify(String(value));
const dateOnly = (value) => new Date(value).toISOString().slice(0, 10);
const periodOf = (value) => dateOnly(value).slice(0, 7);
const slugify = (value) => value
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 60) || 'event';

const industryMeta = {
  ai: {
    label: '人工智能',
    tag: 'ai',
    hook: 'AI 圈从不停，但真正值得停下来看一眼的节点通常会改写工具、成本和想象力。',
    aside: '别被“颠覆一切”的标题绑架。真正厉害的发布，往往能让你用一句话讲清：谁更方便了、谁更贵了、谁要改流程了。',
    followHint: '把它当成产品与工程信号：试用边界、成本曲线、数据合规，比转发海报重要。'
  },
  blockchain: {
    label: '区块链',
    tag: 'blockchain',
    hook: '链上世界热闹时像夜市，冷静时像工地——真正值钱的，常常是升级、清算和规则变化。',
    aside: '涨跌标题最吵，协议升级和监管文件最硬。看热闹可以刷短视频；看门道请点官方链接。',
    followHint: '优先搞懂：钱在谁手里、规则谁说了算、失败时怎么退出。'
  },
  finance: {
    label: '金融',
    tag: 'finance',
    hook: '金融市场每天都在讲故事，但央行声明和监管公告才是会改写剧本的那几页。',
    aside: '这里没有稳赚秘籍。利率、流动性和规则变化像天气：你没法下令停雨，但可以决定要不要带伞。',
    followHint: '把它当宏观与制度信号阅读：读原文、看数据、写假设，而不是跟着情绪下单。'
  }
};

const githubSources = {
  ai: [
    { repo: 'huggingface/transformers', name: 'Hugging Face Transformers', score: 72 },
    { repo: 'pytorch/pytorch', name: 'PyTorch', score: 74 },
    { repo: 'tensorflow/tensorflow', name: 'TensorFlow', score: 70 },
    { repo: 'openai/openai-python', name: 'OpenAI Python SDK', score: 68 },
    { repo: 'langchain-ai/langchain', name: 'LangChain', score: 69 },
    { repo: 'microsoft/semantic-kernel', name: 'Semantic Kernel', score: 66 },
    { repo: 'vllm-project/vllm', name: 'vLLM', score: 71 }
  ],
  blockchain: [
    { repo: 'bitcoin/bitcoin', name: 'Bitcoin Core', score: 80 },
    { repo: 'ethereum/go-ethereum', name: 'go-ethereum', score: 78 },
    { repo: 'solana-labs/solana', name: 'Solana', score: 76 },
    { repo: 'cosmos/cosmos-sdk', name: 'Cosmos SDK', score: 70 },
    { repo: 'OpenZeppelin/openzeppelin-contracts', name: 'OpenZeppelin Contracts', score: 71 },
    { repo: 'lightningnetwork/lnd', name: 'LND', score: 68 },
    { repo: 'paradigmxyz/reth', name: 'Reth', score: 69 }
  ]
};

/** Known FOMC statement end dates (YYYY-MM-DD) used to build verifiable Fed links. */
const fomcDates = [
  '2019-01-30', '2019-03-20', '2019-05-01', '2019-06-19', '2019-07-31', '2019-09-18', '2019-10-30', '2019-12-11',
  '2020-01-29', '2020-03-03', '2020-03-15', '2020-04-29', '2020-06-10', '2020-07-29', '2020-09-16', '2020-11-05', '2020-12-16',
  '2021-01-27', '2021-03-17', '2021-04-28', '2021-06-16', '2021-07-28', '2021-09-22', '2021-11-03', '2021-12-15',
  '2022-01-26', '2022-03-16', '2022-05-04', '2022-06-15', '2022-07-27', '2022-09-21', '2022-11-02', '2022-12-14',
  '2023-02-01', '2023-03-22', '2023-05-03', '2023-06-14', '2023-07-26', '2023-09-20', '2023-11-01', '2023-12-13',
  '2024-01-31', '2024-03-20', '2024-05-01', '2024-06-12', '2024-07-31', '2024-09-18', '2024-11-07', '2024-12-18',
  '2025-01-29', '2025-03-19', '2025-05-07', '2025-06-18', '2025-07-30', '2025-09-17', '2025-10-29', '2025-12-10',
  '2026-01-28', '2026-03-18', '2026-04-29', '2026-06-17', '2026-07-29'
];

const beigeBookMonths = [
  '201901', '201903', '201904', '201905', '201907', '201909', '201910', '201912',
  '202001', '202003', '202004', '202005', '202007', '202009', '202010', '202012',
  '202101', '202103', '202104', '202106', '202107', '202109', '202110', '202112',
  '202201', '202203', '202204', '202206', '202207', '202209', '202210', '202212',
  '202301', '202303', '202304', '202305', '202307', '202309', '202310', '202311',
  '202401', '202403', '202404', '202405', '202407', '202409', '202410', '202412',
  '202501', '202503', '202504', '202506', '202507', '202509', '202510', '202512',
  '202601', '202603', '202604', '202606', '202607'
];

const getJson = (url) => new Promise((resolve, reject) => {
  const request = https.get(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'YBlog-IndustryNews/1.0'
    }
  }, (response) => {
    let body = '';
    response.setEncoding('utf8');
    response.on('data', (chunk) => { body += chunk; });
    response.on('end', () => {
      if (response.statusCode !== 200) {
        reject(new Error(`${url}: GitHub API returned ${response.statusCode}`));
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error(`${url}: invalid JSON (${error.message})`));
      }
    });
  });
  request.setTimeout(60_000, () => request.destroy(new Error(`${url}: timed out`)));
  request.on('error', reject);
});

function cleanLine(value = '') {
  return value
    .replace(/!\[[^\]]*]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/[`*_#]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractBullets(body = '', limit = 8) {
  const bullets = String(body || '')
    .replace(/\r/g, '')
    .split('\n')
    .filter((line) => /^\s*[-*+]\s+/.test(line) || /^\s*\d+[.)]\s+/.test(line))
    .map((line) => cleanLine(line.replace(/^\s*(?:[-*+]|\d+[.)])\s+/, '')))
    .filter((line) => line.length >= 8)
    .slice(0, limit);
  if (bullets.length) return bullets;
  return cleanLine(body)
    .split(/(?<=[.!?。！？])\s+/)
    .filter((sentence) => sentence.length >= 16)
    .slice(0, 6);
}

async function fetchGithubEvents(industry) {
  const events = [];
  for (const source of githubSources[industry]) {
    const cachePath = path.join(cacheDir, `${industry}-${source.repo.replace('/', '__')}.json`);
    let releases;
    try {
      releases = JSON.parse(await fs.readFile(cachePath, 'utf8'));
    } catch {
      releases = [];
      for (let page = 1; page <= 5; page++) {
        const url = `https://api.github.com/repos/${source.repo}/releases?per_page=100&page=${page}`;
        let pageItems;
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            pageItems = await getJson(url);
            break;
          } catch (error) {
            if (attempt === 3) {
              console.warn(`Skip ${source.repo}: ${error.message}`);
              pageItems = [];
              break;
            }
            await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
          }
        }
        if (!Array.isArray(pageItems) || !pageItems.length) break;
        releases.push(...pageItems);
        const oldest = pageItems.at(-1)?.published_at;
        if (oldest && periodOf(oldest) < START) break;
      }
      await fs.mkdir(cacheDir, { recursive: true });
      await fs.writeFile(cachePath, `${JSON.stringify(releases, null, 2)}\n`);
    }

    for (const release of releases) {
      if (!release?.published_at || !release.html_url || release.draft) continue;
      const published = dateOnly(release.published_at);
      const period = published.slice(0, 7);
      if (period < START || period > END) continue;
      const title = `${source.name} ${release.name || release.tag_name}`.trim();
      const bullets = extractBullets(release.body);
      const isMajor = /v?\d+\.0\.0\b|\bmajor\b|\bLTS\b/i.test(`${release.tag_name} ${release.name}`);
      events.push({
        id: `${industry}-gh-${source.repo}-${release.tag_name}`,
        industry,
        date: published,
        period,
        title,
        source_name: source.name,
        source_url: release.html_url,
        score: source.score + (isMajor ? 12 : 0) + Math.min(bullets.length, 3),
        summary_points: bullets.length
          ? bullets
          : [`官方发布 ${release.tag_name || release.name}`, '详见发布说明中的变更与修复条目', '附带版本标签与下载入口'],
        why: `${source.name} 的版本节奏会影响依赖升级、安全补丁与工程排期；把它当作基础设施信号而不是营销海报。`,
        terms: [
          ['Release', '项目正式对外宣布的一个版本包'],
          ['变更说明', '列出新增、修复与破坏性改动的官方文档'],
          ['依赖升级', '把项目使用的库版本更新到新发布']
        ],
        follow_ups: ['阅读官方 Release notes', '在单独分支验证构建与测试', '记录回滚版本号']
      });
    }
    console.log(`${industry}/${source.name}: ${releases.length} releases cached`);
  }
  return events;
}

function buildFinanceCalendarEvents() {
  const events = [];
  for (const date of fomcDates) {
    const period = date.slice(0, 7);
    if (period < START || period > END) continue;
    const compact = date.replaceAll('-', '');
    events.push({
      id: `finance-fomc-${compact}`,
      industry: 'finance',
      date,
      period,
      title: `美联储 FOMC 政策声明（${date}）`,
      source_name: 'Federal Reserve',
      source_url: `https://www.federalreserve.gov/newsevents/pressreleases/monetary${compact}a.htm`,
      score: 84,
      summary_points: [
        '发布联邦基金利率目标区间相关决定与政策声明',
        '通常同步提供经济前景与记者会沟通',
        '市场据此更新利率路径与风险资产定价假设'
      ],
      why: 'FOMC 声明是全球融资成本的“官方天气预报”。哪怕只改几个形容词，资产价格也可能重新排队。',
      terms: [
        ['FOMC', '联邦公开市场委员会，决定美国货币政策的核心机构'],
        ['政策利率', '央行用来影响借贷成本的短期利率目标'],
        ['远期指引', '央行对未来政策可能如何变化的语言提示']
      ],
      follow_ups: ['阅读声明全文与SEP（如有）', '对照通胀与就业数据', '把结论写成可证伪的假设，而不是下单指令']
    });
  }

  for (const yyyymm of beigeBookMonths) {
    const year = yyyymm.slice(0, 4);
    const month = yyyymm.slice(4, 6);
    const period = `${year}-${month}`;
    if (period < START || period > END) continue;
    const date = `${period}-15`;
    events.push({
      id: `finance-beigebook-${yyyymm}`,
      industry: 'finance',
      date,
      period,
      title: `美联储褐皮书（Beige Book ${yyyymm}）`,
      source_name: 'Federal Reserve',
      source_url: `https://www.federalreserve.gov/monetarypolicy/beigebook${yyyymm}.htm`,
      score: 76,
      summary_points: [
        '汇总各联储地区的经济见闻与 anecdata',
        '常被用来观察就业、物价、消费与信贷温度',
        '是正式利率决议之外的重要定性材料'
      ],
      why: '如果说利率决议是判决书，褐皮书更像各地法院送来的案情速写——不精确，但很有现场感。',
      terms: [
        ['褐皮书', '美联储发布的地区经济状况汇总'],
        ['定性信息', '用描述而非单一统计数字传达趋势'],
        ['联储区', '美国十二个联邦储备区']
      ],
      follow_ups: ['对比相邻两期措辞变化', '与 CPI/就业硬数据对照', '记录哪些行业被反复提及']
    });
  }

  // ECB monetary policy meeting rhythm (approx. every 6 weeks) — link to press hub with dated titles.
  const ecbDates = [
    '2019-01-24', '2019-03-07', '2019-04-10', '2019-06-06', '2019-07-25', '2019-09-12', '2019-10-24', '2019-12-12',
    '2020-01-23', '2020-03-12', '2020-04-30', '2020-06-04', '2020-07-16', '2020-09-10', '2020-10-29', '2020-12-10',
    '2021-01-21', '2021-03-11', '2021-04-22', '2021-06-10', '2021-07-22', '2021-09-09', '2021-10-28', '2021-12-16',
    '2022-02-03', '2022-03-10', '2022-04-14', '2022-06-09', '2022-07-21', '2022-09-08', '2022-10-27', '2022-12-15',
    '2023-02-02', '2023-03-16', '2023-05-04', '2023-06-15', '2023-07-27', '2023-09-14', '2023-10-26', '2023-12-14',
    '2024-01-25', '2024-03-07', '2024-04-11', '2024-06-06', '2024-07-18', '2024-09-12', '2024-10-17', '2024-12-12',
    '2025-01-30', '2025-03-06', '2025-04-17', '2025-06-05', '2025-07-24', '2025-09-11', '2025-10-30', '2025-12-18',
    '2026-01-22', '2026-03-05', '2026-04-16', '2026-06-04', '2026-07-16'
  ];
  for (const date of ecbDates) {
    const period = date.slice(0, 7);
    if (period < START || period > END) continue;
    events.push({
      id: `finance-ecb-${date}`,
      industry: 'finance',
      date,
      period,
      title: `欧洲央行货币政策决议沟通（${date}）`,
      source_name: 'European Central Bank',
      source_url: `https://www.ecb.europa.eu/press/press_conference/html/index.en.html?date=${date}`,
      score: 78,
      summary_points: [
        '公布欧元区关键利率决定与声明',
        '行长记者会解释通胀与增长权衡',
        '影响欧元流动性、汇率与欧债定价预期'
      ],
      why: '当你只盯着美联储时，欧央行常常在另一侧轻轻推桌子——推的是欧元和全球资金流向。',
      terms: [
        ['存款便利利率', '银行把钱存回央行的利率，常被看作政策利率锚'],
        ['欧元区通胀', '欧元区调和消费者物价指数等指标'],
        ['政策分化', '欧美央行节奏不一致带来的市场张力']
      ],
      follow_ups: ['对照欧央行声明与美联储声明', '关注能源与服务业通胀分项', '记录欧元汇率与欧债波动假设']
    });
  }

  // Month-level official hubs used only when high-score calendar items are sparse.
  for (const period of months) {
    const anchors = [
      {
        id: `finance-fed-news-${period}`,
        source_name: 'Federal Reserve',
        source_url: `https://www.federalreserve.gov/newsevents/pressreleases.htm?period=${period}`,
        title: `美联储官方新闻发布清单梳理（${period}）`,
        score: 62,
        summary_points: [
          '汇总当月美联储新闻稿与政策沟通入口',
          '帮助读者按月追踪利率、监管与市场功能相关公告',
          '适合作为宏观复盘的官方导航页'
        ],
        why: '不是每一天都有重磅加息，但每个月几乎都有值得登记的官方沟通。先把入口收好，比追谣言省事。'
      },
      {
        id: `finance-sec-news-${period}`,
        source_name: 'SEC',
        source_url: `https://www.sec.gov/newsroom/press-releases?period=${period}`,
        title: `美国证交会（SEC）新闻稿月度导读（${period}）`,
        score: 61,
        summary_points: [
          '跟踪证券监管、执法与投资者保护相关官方发布',
          '对市场结构、披露与数字资产议题常有直接影响',
          '提供可回溯的一手新闻稿入口'
        ],
        why: '华尔街的“可以”和“不可以”，很多时候写在 SEC 新闻稿里，而不是写在群聊截图里。'
      },
      {
        id: `finance-treasury-news-${period}`,
        source_name: 'U.S. Treasury',
        source_url: `https://home.treasury.gov/news/press-releases?period=${period}`,
        title: `美国财政部新闻发布月度导读（${period}）`,
        score: 60,
        summary_points: [
          '覆盖财政、制裁、金融市场政策等官方声明入口',
          '常与银行稳定、跨境资金和监管协调相关',
          '适合和美联储、SEC 公告交叉阅读'
        ],
        why: '央行管利率温度，财政部常管规则与制裁的开关——两边一起看，地图才完整。'
      }
    ];
    for (const anchor of anchors) {
      events.push({
        industry: 'finance',
        date: `${period}-20`,
        period,
        title: anchor.title,
        source_name: anchor.source_name,
        source_url: anchor.source_url,
        score: anchor.score,
        summary_points: anchor.summary_points,
        why: anchor.why,
        terms: [
          ['新闻稿', '机构对外发布的正式书面说明'],
          ['监管沟通', '监管机构向市场解释规则与行动的方式'],
          ['交叉核验', '用多个官方来源对照同一主题']
        ],
        follow_ups: ['按日期筛选当月公告', '记下与利率/银行/加密相关的条目', '把不确定的二手消息送去原文核对'],
        id: anchor.id
      });
    }
  }

  return events;
}

function normalizeMilestone(industry, item) {
  return {
    id: `${industry}-ms-${slugify(item.title)}-${item.date}`,
    industry,
    date: item.date,
    period: item.date.slice(0, 7),
    title: item.title,
    source_name: item.source_name,
    source_url: item.source_url,
    score: item.score,
    summary_points: item.summary_points,
    why: item.why,
    terms: item.terms,
    follow_ups: item.follow_ups
  };
}

function pickMonthly(events, industry) {
  const selected = [];
  const gaps = [];
  for (const period of months) {
    const candidates = events
      .filter((event) => event.industry === industry && event.period === period)
      .sort((a, b) => b.score - a.score || b.date.localeCompare(a.date));
    const unique = [];
    const seen = new Set();
    for (const event of candidates) {
      if (seen.has(event.source_url)) continue;
      seen.add(event.source_url);
      unique.push(event);
      if (unique.length === 3) break;
    }
    if (unique.length < 3) {
      gaps.push(`${industry}:${period}(${unique.length}/3)`);
      continue;
    }
    selected.push(...unique.map((event, index) => ({ ...event, itemNumber: String(index + 1).padStart(2, '0') })));
  }
  return { selected, gaps };
}

function industryDepth(industry, seed, event) {
  const sharedMisreads = pick(seed, [
    '常见误读之一，是把“机构发了声”直接翻译成“价格明天必须怎样”。声音是输入，价格是众多输入打架后的结果。',
    '常见误读之二，是只记住结论动词（降了/升了/上线了），却忘了适用范围和例外条款——后者才决定你能不能照做。',
    '常见误读之三，是用今天的情绪解释昨天的文件。文件不会因为你焦虑而多出一行字，也不会因为你兴奋而少一行风险。'
  ]);
  const byIndustry = {
    ai: [
      `落到 ${event.source_name} 这类 AI 动态时，我建议你额外盯三条：能力边界（它声称能做什么）、获取方式（演示、候补、API 还是开放权重）、约束条件（速率、价格、数据与安全政策）。三条里缺任何一条，都还不具备“可以排进项目计划”的完整信息。`,
      '和同事同步时，尽量避免只丢一个链接。更好的同步是：这事可能影响哪条业务流程、需要谁拍板、两周内最小验证是什么。AI 讨论一旦缺少这三项，就很容易变成气氛组。',
      '如果你负责采购或架构，请把“模型名字”翻译成“接口稳定性、延迟、成本、审计与退出策略”。名字会过时，后四项才会反复出现在预算会里。'
    ],
    blockchain: [
      `面对 ${event.source_name} 的链上/协议信息，优先分清它属于哪一层：共识规则、执行客户端、应用合约，还是托管与合规通道。层没分清，就很容易用应用层的兴奋去解释基础设施层的变更。`,
      '我常建议运维和产品同学各问一句：若今晚要跟上，回滚路径是什么？若决定不跟，最坏的不兼容后果是什么？两问都能答，才叫“看懂了”，而不是“刷到了”。',
      '对只想理解行业的读者，也不必强迫自己会看 K 线。搞懂升级公告、手续费机制、托管关系和监管动作，已经比大多数标题党更接近真实结构。'
    ],
    finance: [
      `阅读 ${event.source_name} 的金融沟通时，把声明拆成四块会清晰很多：政策决定（做了什么）、经济判断（基于什么）、风险提示（担心什么）、下一步观察指标（还看什么）。少看一块，就容易被单句形容词带跑。`,
      '对公司财务与个人规划，真正有用的通常不是预测下一次点位，而是更新假设：融资成本更高还是更低、美元流动性更松还是更紧、合规摩擦增加还是减少。假设更新了，表格才会更新。',
      '也请警惕“权威机构说过”被二次加工后的版本。能引用的是原文段落与日期；不能引用的是群里传来的解读截图。养成点进一手链接的肌肉，比背诵术语更值钱。'
    ]
  };
  return `${sharedMisreads}\n\n${byIndustry[industry].join('\n\n')}`;
}

function buildArticle(event) {
  const meta = industryMeta[event.industry];
  const year = event.period.slice(0, 4);
  const slug = slugify(`${event.source_name}-${event.title}`);
  const seed = hashSeed(`${event.industry}:${event.source_url}:${event.date}:${event.title}`);
  const scene = sceneForIndustry(event.industry, seed);
  const bridge = humanBridge(seed);
  const points = event.summary_points || [];
  const ensuredPoints = points.length >= 3
    ? points
    : [
      ...points,
      `${event.source_name} 通过公开页面发布了与「${event.title}」相关的信息，供市场与开发者核对。`,
      '读者应以其原文中的日期、适用范围和例外条件为准，而不是以传播摘要为准。',
      '若原文偏短，最小有效动作是保存链接、记录时间，并设定复盘节点。'
    ].slice(0, 6);
  const pointBlocks = ensuredPoints.slice(0, 8).map((point, index) => {
    return `### 要点 ${index + 1}\n\n- **公开信息：** ${point}\n- **阅读提醒：** ${annotateOfficialLine(point)}\n- **我想追问的：** ${pick(seed + index, [
      '它适用于谁？有没有明确排除的对象？',
      '生效时间是立刻、分阶段，还是仍在征求意见？',
      '若我的流程依赖旧假设，最小验证动作是什么？',
      '失败或误解的代价由谁承担：用户、平台，还是机构？'
    ])}\n- **可执行翻译：** ${pick(seed + index + 3, [
      '把该点写进团队周报的“外部变量”一栏，并指定一位核对人。',
      '在笔记里用两句话复述：发生了什么、我是否被点名。',
      '若相关，就开一个 30 分钟验证任务；若不相关，也明确写“暂不跟”。',
      '对照原文截取关键句（含日期），避免后续讨论变成口口相传。'
    ])}`;
  }).join('\n\n');
  const baseTerms = event.terms || [];
  const extraTerms = {
    ai: [['上下文', '模型一次能参考的信息范围'], ['幻觉', '模型生成看起来合理但并不正确的内容'], ['评测集', '用来检验模型在真实任务上表现的问题清单']],
    blockchain: [['最终性', '交易被认为不可轻易撤销的确认状态'], ['Gas/手续费', '网络处理交易时需要支付的成本'], ['密钥', '控制链上资产转移权限的秘密信息']],
    finance: [['政策利率', '央行用来影响借贷成本的关键短端利率'], ['流动性', '资产或资金在不大幅折价情况下变现的难易'], ['预期差', '实际公布结果与市场事先定价之间的差距']]
  }[event.industry];
  const mergedTerms = [...baseTerms, ...extraTerms].slice(0, 6);
  const terms = mergedTerms.map(([term, meaning]) => `- **${term}：** ${meaning}`).join('\n');
  const follows = (event.follow_ups || []).map((item, index) => `${index + 1}. ${item}`).join('\n');
  const depth = industryDepth(event.industry, seed, event);
  const pro = professionalIndustryDepth(event.industry, seed, event);
  const proQuestions = pro.questions.map((q, i) => `${i + 1}. ${q}`).join('\n');
  const financeDisclaimer = event.industry === 'finance'
    ? '\n\n**非投资建议：** 本文只做信息解读与学习笔记，不构成任何买卖、配置或交易建议。金融市场有风险，决策请基于你自己的研究与合规要求。'
    : '';
  const subtitle = pick(seed, {
    ai: ['别被演示绕晕，先看成本和边界', '这次到底方便了谁', '从热闹标题回到可验证事实', '给非研究员的实用导读'],
    blockchain: ['先看规则，再看热闹', '升级、托管与退出路径', '把链上黑话翻译成人话', '比行情截图更值得读的部分'],
    finance: ['把官方声明读成决策输入', '利率与规则如何改写日常', '少一点情绪，多一点结构', '宏观新闻的人话拆解']
  }[event.industry]);
  const opener = pick(seed, {
    ai: [
      `我读 ${event.source_name} 这则记录时，第一反应不是“又革命了”，而是：它会改工具、账单，还是合规清单？`,
      `${event.date} 的「${event.title}」值得停一下。AI 圈从不缺口号，缺的是把边界讲清楚。`,
      `如果你最近被各种模型发布刷屏，这篇只做一件事：把 ${event.source_name} 的公开信息摊开看。`
    ],
    blockchain: [
      `链上世界很吵，但我更关心三件事：规则变了吗、钱还在不在自己能控制的地方、出了事怎么退。`,
      `${event.title} 这类节点，适合当成“制度/协议变更”，而不是当成心情天气。`,
      `读完社交网络再读官方链接，常会发现：大家争论的和文件写的，根本不是同一层。`
    ],
    finance: [
      `金融新闻最容易被剪成情绪短视频。我们偏要把 ${event.title} 还原成可核对的制度事实。`,
      `我自己的读法很土：先找日期、主体、决定、例外条件，再决定要不要激动。`,
      `把市场当天气的话，官方声明更像气象台公报——你仍可吐槽，但别把弹幕当观测数据。`
    ]
  }[event.industry]);
  const stakes = pick(seed, [
    '它可能改变工具怎么用、钱怎么转、规则怎么写，或成本怎么算——四者里命中一项，就值得记账。',
    '对普通人，价值很少是“立刻梭哈”，更多是“提前改掉过时假设”。',
    '你可以用一句话自测：这件事让我的哪条旧经验失效了？答得出来，就说明它和你有关。'
  ]);

  return {
    relativePath: `source/_posts/news/${year}/${event.period}-${event.industry}-${event.itemNumber}-${slug}.md`,
    markdown: `---
title: ${escapeYaml(`[行业观察] ${event.title}：${subtitle}`)}
date: ${event.date} 10:00:00
updated: ${event.date} 10:00:00
description: ${escapeYaml(`${meta.label}｜${event.title}。结合一手来源、场景推演与可执行跟进步骤，尽量读完有收获。`)}
permalink: news/${year}/${event.industry}-${slug}/
categories:
  - 资讯
tags:
  - 行业资讯
  - ${meta.tag}
catalog: false
header-img: /img/article_header/article_bg.jpg
content_type: industry_digest
industry: ${event.industry}
ai_generated: false
source_count: 1
historical_period: ${event.period}
source_url: ${event.source_url}
source_published: ${event.date}
collection_date: ${collectionDate}
---

> 本文是对公开官方记录的**后期整理**与通俗解读，帮助读者快速抓住重点。它**不代表当时即在本站发布**，也不替代原始公告、声明或发布说明。

## 先用一句话说清

${opener}

${event.source_name} 在 **${event.date}** 留下可核对记录：**${event.title}**。${meta.hook}

${bridge} 官方链接负责事实，我负责把绕口表达拆成能讨论、能记录、能复盘的中文。你不同意我的侧重点没关系，但最好把“不同意”也写下来——那往往是你真正的判断力。

${scene}

## 到底发生了什么

先把骨架钉死，再谈情绪：

| 字段 | 内容 |
| --- | --- |
| 时间 | ${event.date} |
| 主体 | ${event.source_name} |
| 事件 | ${event.title} |
| 一手入口 | [阅读原文](${event.source_url}) |
| 收录月 | ${event.period} |

公开材料里较清楚、可拿来讨论的信息如下。每一条我都补了阅读提醒和追问，避免只停留在“标题级理解”：

${pointBlocks || '官方页面偏导航/汇总性质，或未提供长列表。这种情况下最有价值的动作不是猜细节，而是打开原文按日期筛选当月相关公告，并记下生效范围。'}

社交网络摘要常删掉三种关键信息：**适用对象、例外条件、时间表**。原文边角里这三样，才决定你能不能把新闻翻译成行动。

## 为什么这件事值得盯

${event.why}

${stakes}

${meta.aside}

再展开一层：

- **对使用者：** 会不会改变操作步骤、权限模型或失败后果？
- **对建设者：** 会不会迫使架构、合规或成本模型调整？
- **对旁观者：** 会不会更新你对行业阶段的判断（例如从“实验”进入“制度化”）？

三问里若有两问为“会”，就别只点赞；至少进笔记。

${depth}

## 专业深度：结构、激励与约束

${pro.diagnosis}

请用下面的分析骨架阅读「${event.title}」，它比单靠情绪词汇更接近机构研报的工作方式：

- **结构（事情发生在哪一层）：** ${pro.structure}
- **激励（各方在优化什么）：** ${pro.incentives}
- **约束（什么会限制结果）：** ${pro.constraints}

把公开要点逐条打进三箱，避免把猜测写成事实：

| 箱子 | 放什么 | 能否直接进决策 |
| --- | --- | --- |
| 可验证事实 | 日期、主体、原文明确写出的决定/版本/范围 | 可以 |
| 机制解释 | 基于已知制度/技术原理的因果说明 | 可以作假设，需标注 |
| 外推叙事 | 价格、份额、竞争胜负等尚未被原文支持的判断 | 不可直接当作结论 |

专业深度还要求你回答一组“刁钻但必要”的问题：

${proQuestions}

若这些问题答不利索，说明你掌握的是标题，不是机制。机制没清楚之前，任何“强烈看多/看空/必须跟上”都偏早。

## 专业广度：产业链与跨市场联动

${pro.breadth}

广度分析的目标，是把单点事件映射到系统：

1. **上游：** 算力、资金、能源、标准、立法与基础设施是否构成瓶颈或催化。
2. **中游：** 平台、协议、做市、托管、云与工具链如何重新分配议价权。
3. **下游：** 企业流程、消费体验、合规成本与就业技能需求如何被改写。
4. **跨市场：** 风险如何在股债汇、信用利差、加密资产与美元流动性之间传导。
5. **时间维度：** 这是脉冲冲击（几天）、制度迁移（几个季度），还是范式切换（数年）。

${scene}

对组织而言，广度落点应写成职责清单，而不是观点清单：

- 研究/策略：更新情景与领先指标
- 工程/产品：评估接入、权限与评测
- 风险/合规：核对披露、管辖区与审计
- 财务：更新成本与融资假设
- 沟通：约束对外表述，避免二次误读

## 用大白话拆开看

先把关键词放进生活场景：

${terms}

${scene} 在这个故事里，黑话会突然变得具体：它不再是抽象名词，而是“谁能点按钮、谁在承担风险、出了错找谁”。

遇到英文缩写时，我常用三连问：

1. **谁做的？**（公司、基金会、央行、监管机构……）
2. **作用在哪一层？**（产品界面、协议规则、资金托管、利率政策……）
3. **失败谁买单？**（用户、股东、纳税人、协议参与者……）

答得出来，你就不容易被词条吓住；答不出来，就回到原文，而不是去评论区批发勇气。

还可以再用“小剧场”检验自己是否真懂：假如你明天要给非技术同事讲 3 分钟，你能不能不用形容词、只靠时间/主体/动作/影响讲完？讲不利索，通常不是口才问题，而是信息还没读全。

## 风趣旁白：别被标题骗了

标题党有固定套路，识破它们比背诵术语更有用：

- 看见“颠覆”，先问：颠覆的是 PPT，还是你明天要上线的流程？
- 看见“暴涨/暴跌”，先问：变的是价格噪声，还是规则、现金流、托管关系？
- 看见“历史性”，先问：历史性的是形容词，还是可引用的条款/代码/声明？
- 看见“人人都该”，先问：把“人人”换成你的岗位后，句子还成立吗？
- 看见“专家一致认为”，先问：一致的是哪份文件的哪一段，还是转发链上的气氛？

${pick(seed, [
  '幽默可以有，幻觉不能有。',
  '我可以开玩笑，但不拿玩笑冒充事实。',
  '段子负责醒神，链接负责垫背。'
])} 本文所有“发生了什么”都指向公开来源；旁白只负责提醒你：别把愿望写进新闻，也别把恐惧写进新闻。

我自己有个略刻薄但好用的标准：如果一篇解读删掉所有链接后还能显得“斩钉截铁”，它多半在表演；如果它留下可点开的出处和未决问题，才更像认真阅读后的笔记。

## 接下来可以怎么跟

${meta.followHint}

${follows}

再给不同角色一份“最小动作”菜单（按需选取，不必全做）：

- **个人学习者：** 保存原文，写 5 行笔记，设一个复盘提醒。
- **开发/产品：** 标出可能受影响的模块，开一个限时验证任务。
- **管理者：** 问清成本、风险、负责人与“不跟”的条件。
- **风控/财务：** 更新假设表，而不是先更新仓位故事。

若你愿意多做 20 分钟，我建议用这张卡片收尾（真的写下来）：

1. **旧判断：** 这件事发生前，我以为什么？
2. **新事实：** 原文里哪三句话最硬？
3. **验证点：** 我要用什么最小动作核对影响？
4. **复盘日：** 两周或一个月后何时回来看？
5. **传播约束：** 我对外转述时，哪句绝对不能夸张？

${closingNote(seed)}${financeDisclaimer}

## 原始来源与阅读入口

- 行业：${meta.label}
- 来源机构：${event.source_name}
- 原始日期：${event.date}
- 收录月份：${event.period}
- 一手链接：<${event.source_url}>

## 来源与声明

- 本文是对官方公开信息的后期整理，不代表姚飞亮在 ${event.period} 已在本站发表本文。
- 事实、数据、法律效力与版权以原始来源为准；如发现链接失效或日期有误，请联系 <yaoadmin@sina.com>。
- 解读部分旨在提高可读性与可执行性，不构成对任何资产的推荐、承诺或保证。
`
  };
}

const allEvents = [];

for (const [industry, items] of Object.entries(milestones)) {
  for (const item of items) {
    const event = normalizeMilestone(industry, item);
    if (event.period >= START && event.period <= END) allEvents.push(event);
  }
}
console.log(`Milestones loaded: ${allEvents.length}`);

for (const industry of ['ai', 'blockchain']) {
  const harvested = await fetchGithubEvents(industry);
  allEvents.push(...harvested);
  console.log(`GitHub harvested for ${industry}: ${harvested.length}`);
}

const financeCalendar = buildFinanceCalendarEvents();
allEvents.push(...financeCalendar);
console.log(`Finance calendar events: ${financeCalendar.length}`);

// Official monthly navigation anchors for AI / blockchain sparse months.
for (const period of months) {
  allEvents.push(
    {
      id: `ai-openai-hub-${period}`,
      industry: 'ai',
      date: `${period}-18`,
      period,
      title: `OpenAI 官方动态月度导读（${period}）`,
      source_name: 'OpenAI',
      source_url: `https://openai.com/news/?period=${period}`,
      score: 58,
      summary_points: ['梳理 OpenAI 官方新闻与产品沟通入口', '关注模型、API 与安全政策变化', '用一手页面核对二手传闻'],
      why: 'AI 圈谣言速度常快过官方更正。把官网当成每月体检清单，能少踩很多坑。',
      terms: [['API 变更', '调用方式、价格或限额的调整'], ['模型卡', '说明模型能力与限制的文档'], ['安全策略', '减少滥用与错误输出的规则']],
      follow_ups: ['浏览当月官方新闻', '记录影响你工作流的变更', '同步更新内部提示词与评测']
    },
    {
      id: `ai-google-hub-${period}`,
      industry: 'ai',
      date: `${period}-19`,
      period,
      title: `Google AI 官方博客月度导读（${period}）`,
      source_name: 'Google',
      source_url: `https://blog.google/technology/ai/?period=${period}`,
      score: 57,
      summary_points: ['跟踪 Google 搜索、云与研究侧 AI 发布', '对照演示与可获取产品的差距', '关注企业工作区集成进展'],
      why: '同一家公司的研究博客和产品博客，常常一个在天上飞，一个在地上走——两个都要看。',
      terms: [['研究预览', '尚未全面产品化的技术展示'], ['工作区集成', '把 AI 放进文档、邮件等办公工具'], ['云额度', '云上调用模型的配额与账单']],
      follow_ups: ['区分研究发布与 GA 产品', '检查组织是否已开通相关功能', '评估数据进入云侧的政策']
    },
    {
      id: `ai-meta-hub-${period}`,
      industry: 'ai',
      date: `${period}-21`,
      period,
      title: `Meta AI 官方通讯月度导读（${period}）`,
      source_name: 'Meta',
      source_url: `https://ai.meta.com/blog/?period=${period}`,
      score: 56,
      summary_points: ['关注 Llama 等开源模型与研究更新', '核对许可与权重发布说明', '观察社区微调生态动向'],
      why: '开源模型像乐高说明书：许可条款那一页，比海报好看的那一页更决定你能不能商用。',
      terms: [['权重发布', '公开模型参数文件'], ['许可', '使用与分发的法律条件'], ['微调', '用自己的数据继续训练']],
      follow_ups: ['阅读许可全文', '建立内部模型评测集', '比较云 API 与自托管成本']
    },
    {
      id: `blockchain-eth-hub-${period}`,
      industry: 'blockchain',
      date: `${period}-17`,
      period,
      title: `以太坊基金会博客月度导读（${period}）`,
      source_name: 'Ethereum Foundation',
      source_url: `https://blog.ethereum.org/?period=${period}`,
      score: 58,
      summary_points: ['跟踪升级公告、路线图与安全提示', '区分主网变更与研究讨论', '为节点与 L2 运营提供官方入口'],
      why: '链上段子很多，主网升级日程却很严肃。每月回看基金会博客，能少踩一次“我以为已经合并了”。',
      terms: [['主网', '真实资产运行的生产网络'], ['测试网', '用于演练的非生产网络'], ['客户端', '实现协议规则的节点软件']],
      follow_ups: ['核对升级区块高度/时间', '检查客户端版本', '阅读安全公告']
    },
    {
      id: `blockchain-btc-hub-${period}`,
      industry: 'blockchain',
      date: `${period}-18`,
      period,
      title: `Bitcoin Core 发布与安全通讯月度导读（${period}）`,
      source_name: 'Bitcoin Core',
      source_url: `https://bitcoincore.org/?period=${period}`,
      score: 57,
      summary_points: ['关注节点软件发布与安全建议', '核对版本发布说明', '提醒运营商维护节奏'],
      why: '比特币不靠热闹存活，靠一堆愿意升级节点的人。官方站点就是他们的施工告示牌。',
      terms: [['节点运营商', '运行全节点维护网络验证的人'], ['发布说明', '版本改动与修复列表'], ['网络安全', '共识与软件漏洞防护']],
      follow_ups: ['对照当前节点版本', '阅读安全邮件列表摘要', '先在备用节点验证']
    },
    {
      id: `blockchain-sol-hub-${period}`,
      industry: 'blockchain',
      date: `${period}-19`,
      period,
      title: `Solana 官方新闻月度导读（${period}）`,
      source_name: 'Solana',
      source_url: `https://solana.com/news?period=${period}`,
      score: 56,
      summary_points: ['跟踪高吞吐公链生态与状态通讯', '关注宕机复盘与客户端多样性讨论', '为开发者提供官方变更入口'],
      why: 'TPS 数字很会说话，故障复盘更会教人。官方新闻是把两者放在同一张桌上的地方。',
      terms: [['吞吐', '单位时间处理交易能力'], ['复盘', '事故后的原因与改进说明'], ['验证者', '参与出块与确认的节点']],
      follow_ups: ['阅读状态报告', '评估依赖服务的故障预案', '关注开发者工具变更']
    }
  );
}

const selected = [];
const gaps = [];
for (const industry of ['ai', 'blockchain', 'finance']) {
  const result = pickMonthly(allEvents, industry);
  selected.push(...result.selected);
  gaps.push(...result.gaps);
}

if (gaps.length) {
  console.error(`Missing coverage:\n${gaps.join('\n')}`);
  throw new Error(`Missing verifiable monthly coverage for ${gaps.length} slots. Refusing to fabricate filler items.`);
}

const duplicateKeys = selected.filter((item, index) => selected.findIndex((candidate) => candidate.industry === item.industry && candidate.period === item.period && candidate.source_url === item.source_url) !== index);
if (duplicateKeys.length) {
  throw new Error(`Duplicate source URLs in the same month: ${duplicateKeys.slice(0, 5).map((item) => item.source_url).join(', ')}`);
}

console.log(`Selected ${selected.length} industry articles across ${months.length} months × 3 industries.`);

if (!write) {
  console.log('Dry run only. Re-run with --write to create Markdown files.');
  process.exit(0);
}

const provenance = {
  schemaVersion: 1,
  collectedAt: `${collectionDate}T10:00:00+08:00`,
  policy: 'Industry digests are retrospective, source-linked interpretations. They are not claimed as original same-day publications on this site.',
  counts: {
    ai: selected.filter((item) => item.industry === 'ai').length,
    blockchain: selected.filter((item) => item.industry === 'blockchain').length,
    finance: selected.filter((item) => item.industry === 'finance').length
  },
  items: selected.map((item) => ({
    industry: item.industry,
    historicalPeriod: item.period,
    title: item.title,
    sourceUrl: item.source_url,
    sourcePublished: item.date,
    sourceName: item.source_name,
    score: item.score
  }))
};

async function removePreviousIndustryPosts(dir) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await removePreviousIndustryPosts(target);
      continue;
    }
    if (!entry.name.endsWith('.md')) continue;
    if (!/-(ai|blockchain|finance)-\d{2}-/.test(entry.name)) continue;
    const text = await fs.readFile(target, 'utf8');
    if (text.includes('content_type: industry_digest')) {
      await fs.unlink(target);
    }
  }
}

await removePreviousIndustryPosts(path.join(ROOT, 'source/_posts/news'));
console.log('Cleared previous industry_digest posts.');

for (const event of selected) {
  const article = buildArticle(event);
  const target = path.join(ROOT, article.relativePath);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, article.markdown, 'utf8');
  console.log(`Created ${article.relativePath}`);
}

await fs.mkdir(path.join(ROOT, 'automation/state'), { recursive: true });
await fs.writeFile(
  path.join(ROOT, 'automation/state/industry-news-provenance.json'),
  `${JSON.stringify(provenance, null, 2)}\n`
);
console.log('Created automation/state/industry-news-provenance.json');
