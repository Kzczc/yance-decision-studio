/*
 * Yance scenario catalogue and deterministic planning models.
 * No network, personal data, AI calls, or real-world forecasts are implied.
 * Money: CNY. Rates in returned rows: percentage points (0–100).
 * Counts are expected values; round only for display to preserve identities.
 * Each alternative receives the same complete population and its own budget.
 */
(function (global) {
  "use strict";

  var COLORS = ["#7897a7", "#c48771", "#739783", "#b5a166"];
  function metric(key, label, unit, format, better, description) {
    return { key: key, label: label, unit: unit, format: format, better: better || "max", description: description || "" };
  }
  function control(key, label, type, min, max, step, unit, section, hint, options) {
    return { key: key, label: label, short: label, type: type, min: min, max: max, step: step, unit: unit || "", section: section || "shared", scheme: section === "open" || section === "member" ? section : null, scenario: section === "open" || section === "member" ? section : null, hint: hint || "", options: options || [] };
  }
  function segment(id, name, short, desc, base, index, quote) {
    return { id: id, name: name, short: short, desc: desc, base: base, color: COLORS[index], quote: quote };
  }
  var periodOptions = [{ value: 7, label: "7 天" }, { value: 14, label: "14 天" }, { value: 30, label: "30 天" }];

  var modules = [
    {
      id: "growth", title: "GrowthLab", productLabel: "企业增长", english: "Product adoption", audience: "企业与业务团队", icon: "chart-no-axes-combined", order: 1,
      subtitle: "评估产品引导调整对激活与留存的影响。",
      decision: "首次使用流程应保留几步？哪些新用户需要人工引导？",
      worldTitle: "产品旅程街区", worldSubtitle: "跟踪用户从初次到访、完成关键操作到持续使用的旅程。",
      audienceTitle: "用户构成",
      audienceNote: "每位用户按本次进入产品时的主要状态归入一组。实际应用应以产品行为定义分组，并用业务数据校准各组占比。",
      strategyTitle: "新用户激活方案", compareTitle: "比较激活表现与后续留存。",
      schemes: [
        { id: "baseline", name: "现行五步引导", short: "现行流程", desc: "保留五步自助引导，作为比较基线。", tag: "对照" },
        { id: "open", name: "精简自助引导", short: "精简引导", desc: "缩短首次使用流程，帮助用户更快完成核心操作。", tag: "方案 A" },
        { id: "member", name: "人工引导支持", short: "人工引导", desc: "为部分新用户安排一对一支持；覆盖人数受顾问席位与预算限制。", tag: "方案 B" }
      ],
      controls: [
        control("stepsA", "引导步骤数", "range", 1, 5, 1, "步", "open", "现行流程为 5 步。缩短流程可能降低使用阻力，也可能减少必要说明。"),
        control("assistedReach", "计划人工覆盖比例", "range", 0, 100, 5, "%", "member", "实际覆盖还受每日接待能力与服务预算限制。"),
        control("supportAgents", "每日顾问席位", "number", 1, 50, 1, "席", "member", "每席每天最多接待 40 人；每名覆盖用户按 8 元计入增量服务费。"),
        control("daily", "每日新增用户", "number", 50, 50000, 50, "人 / 天", "shared", "各方案使用相同的新用户规模与客群构成。"),
        control("days", "用户进入周期", "select", 7, 30, 1, "天", "shared", "7 日留存在用户激活后计时；完整验证还需等待最后一位用户满 7 天。", periodOptions),
        control("budget", "单方案增量服务预算", "number", 0, 1000000, 500, "元", "shared", "各方案分别受预算约束。自助引导按覆盖用户计 0.35 元，人工支持按覆盖用户计 8 元。")
      ],
      segments4: [
        segment("explore", "首次探索者", "先判断是否适合", "尚未形成明确使用目标；首次体验的步骤与信息量会影响其是否继续。", 0.12, 0, "我想先试用一下，再决定要不要继续。"),
        segment("intent", "明确需求用户", "带着具体任务而来", "目标明确，关注能否快速完成首次核心操作。", 0.30, 1, "我想尽快把这件事办完。"),
        segment("migrate", "同类产品迁移者", "已有相关工具经验", "熟悉同类产品，更关注数据迁移效率与功能匹配。", 0.52, 2, "把现有工作迁过来，需要多少时间？"),
        segment("return", "再次到访未激活者", "此前尚未完成关键操作", "曾到访但未完成核心操作；明确并解决具体阻碍有助于继续使用。", 0.38, 3, "上次没完成的操作，这次能顺利做完吗？")
      ],
      objectives: [{ value: "retained", label: "增加 7 日留存用户" }, { value: "activated", label: "增加激活用户" }],
      metrics: [
        metric("activated", "激活用户", "人", "integer", "max", "完成预先定义核心操作的新用户数；试验前应固定激活事件口径。"),
        metric("rate", "激活率", "%", "percent", "max", "激活用户数 ÷ 进入产品的新用户数。"),
        metric("retained", "7 日留存用户", "人", "integer", "max", "按预先定义的留存事件，统计激活后第 7 日仍在使用的用户。"),
        metric("unitCost", "每位激活用户服务成本", "元 / 人", "currency", "min", "本方案增量服务费用 ÷ 全部激活用户数；不含获客与既有平台成本。")
      ],
      tableMetrics: [metric("activated", "激活用户", "人", "integer"), metric("rate", "激活率", "%", "percent"), metric("retained", "7 日留存用户", "人", "integer"), metric("retention", "激活后 7 日留存率", "%", "percent", "max", "7 日留存用户数 ÷ 激活用户数。"), metric("cost", "增量服务费", "元", "currency", "min", "本方案新增自助引导或人工支持的服务费用。")],
      defaultState: { scheme: "open", objective: "retained", weights: [35, 30, 20, 15], params: { stepsA: 2, assistedReach: 40, supportAgents: 4, daily: 1000, days: 14, budget: 30000 } },
      assumptions: [
        "四类客群的激活基线依次为 12%、30%、52%、38%；激活后 7 日留存基线依次为 28%、56%、68%、50%。均为情景假设，需用业务数据校准。",
        "引导由 5 步缩短至 1 步时，四类客群的激活率最高分别增加 15、14、7、11 个百分点；激活后留存率分别减少 8、3、1、2 个百分点。",
        "人工引导覆盖时，四类客群的激活率分别增加 12、22、16、24 个百分点；激活后留存率分别增加 8、10、6、8 个百分点。",
        "人工引导覆盖人数取计划人数、顾问席位可接待人数与预算可承担人数中的最小值。自助引导按覆盖用户计费；预算不足时按比例缩减覆盖。",
        "仅计方案新增服务费用；不含广告获客、产品开发、既有平台、固定人员及其他运营成本。每位激活用户服务成本不等同于完整获客成本。"
      ],
      validation: ["按用户随机分组；预先固定新用户资格、分流比例与激活事件。", "同步记录激活率、激活后 7 日留存、人工支持工时与投诉。", "待各组最后一位用户满 7 日观察期后，再比较留存结果。"]
    },
    {
      id: "merchant", title: "BizLab", productLabel: "商户经营", english: "Local commerce", audience: "店主与个体经营者", icon: "store", order: 2,
      subtitle: "比较优惠策略对成交、实收与贡献毛利的影响。",
      decision: "新品首发应面向所有顾客提供优惠，还是定向回馈会员？",
      worldTitle: "社区商业街区", worldSubtitle: "跟踪到店、选购与结账过程，比较不同顾客对经营方案的反应。",
      audienceTitle: "客群构成",
      audienceNote: "非会员按主要购买动机分组；会员按最近购买时间分组。四类客群互斥，比例为本次研究设定。",
      strategyTitle: "新品优惠方案", compareTitle: "同时比较订单、实收与贡献毛利。",
      schemes: [
        { id: "baseline", name: "新品原价销售", short: "原价销售", desc: "不额外提供优惠，作为自然购买基线。", tag: "对照" },
        { id: "open", name: "全客群优惠", short: "通用优惠", desc: "对所有触达顾客提供单笔优惠，比较成交增量与优惠成本。", tag: "方案 A" },
        { id: "member", name: "会员定向优惠", short: "会员定向", desc: "仅向设定范围的会员提供单笔优惠，比较成交与毛利表现。", tag: "方案 B" }
      ],
      controls: [
        control("couponA", "每位顾客优惠", "range", 0, 40, 1, "元", "open", "每位顾客最多计一笔订单；优惠额不高于商品售价。"),
        control("couponB", "每位会员优惠", "range", 0, 40, 1, "元", "member", "仅对所选会员范围生效；与通用优惠分别设置。"),
        control("memberTarget", "适用会员范围", "select", null, null, null, "", "member", "按最近一次购买时间划分会员状态。", [{ value: "all", label: "全部会员" }, { value: "active", label: "近 30 天有购买" }, { value: "dormant", label: "31–180 天未购买" }]),
        control("price", "商品售价", "number", 1, 9999, 1, "元 / 件", "shared", "所有方案采用相同售价。"),
        control("cost", "单件变动成本", "number", 0, 9999, 1, "元 / 件", "shared", "可计入采购、包装与履约成本；不含租金等固定成本。"),
        control("daily", "每日触达顾客数", "number", 20, 50000, 10, "人 / 天", "shared", "按触达顾客计数；每位顾客最多购买一件。"),
        control("days", "活动周期", "select", 7, 30, 1, "天", "shared", "各方案使用相同的活动起止周期。", periodOptions),
        control("budget", "单方案优惠预算", "number", 0, 1000000, 500, "元", "shared", "仅实际核销金额计入费用；未使用余额不作为成本。")
      ],
      segments4: [
        segment("value", "价格敏感新客", "关注实付价格", "尚未成为会员；对价格变化较敏感，倾向先比较优惠条件。", 0.045, 0, "优惠规则清楚、价格合适，我会考虑试试。"),
        segment("quality", "品质导向新客", "关注产品与体验", "尚未成为会员；更重视产品品质、服务与新品体验。", 0.065, 1, "我想先了解产品，再判断是否适合自己。"),
        segment("active", "活跃会员", "近 30 天有购买", "近 30 天有购买记录；已熟悉品牌，关注产品体验与会员权益。", 0.105, 2, "如果确实适合我，我会关注这次新品。"),
        segment("dormant", "待唤回会员", "31–180 天未购买", "31–180 天未购买；是否回访可能受产品相关性与优惠条件影响。", 0.035, 3, "如果有合适的新品或优惠，我会再看看。")
      ],
      objectives: [{ value: "margin", label: "提高活动贡献毛利" }, { value: "orders", label: "增加成交订单" }],
      metrics: [metric("rate", "购买转化率", "%", "percent", "max", "成交订单数 ÷ 触达顾客数。"), metric("revenue", "实收销售额", "元", "currency", "max", "商品售价收入扣除已核销优惠后的金额。"), metric("margin", "活动贡献毛利", "元", "currency", "max", "实收销售额扣除商品变动成本；不等同于净利润。"), metric("subsidy", "优惠核销额", "元", "currency", "min", "已实际核销的优惠金额；预算余额不计入费用。")],
      tableMetrics: [metric("orders", "成交订单", "单", "integer", "max", "按每位触达顾客最多一笔订单计算。"), metric("rate", "购买转化率", "%", "percent"), metric("revenue", "实收销售额", "元", "currency"), metric("margin", "贡献毛利", "元", "currency"), metric("subsidy", "优惠核销额", "元", "currency", "min")],
      defaultState: { scheme: "open", objective: "margin", weights: [35, 25, 25, 15], params: { couponA: 8, couponB: 15, memberTarget: "all", price: 59, cost: 24, daily: 715, days: 14, budget: 8000 } },
      assumptions: [
        "四类客群的原价购买转化基线依次为 4.5%、6.5%、10.5%、3.5%。优惠响应系数为情景参数，实际应用需用经营数据校准。",
        "模型按优惠额占售价的比例调整购买响应，并设置边际递减；购买转化率上限为 60%。每位顾客最多计一笔订单。",
        "预算不足时，按比例缩减符合条件的顾客覆盖；未获得优惠的顾客按原价购买响应计算。实际优惠核销额不超过预算。",
        "实收销售额 = 售价 × 订单数 − 优惠核销额；贡献毛利 = 实收销售额 − 单件变动成本 × 订单数。优惠仅扣减一次，预算余额不计为成本。",
        "贡献毛利不等于净利润。测算未计租金、获客、税费、退货及后续复购，也不提供统计置信区间。"
      ],
      validation: ["预先固定会员口径、优惠资格、预算耗尽规则与活动周期。", "以每位触达顾客的贡献毛利为主指标，并同步记录订单、退款与优惠核销。", "三组同期随机分流；结合历史波动计算样本量后再评估经营效果。"]
    },
    {
      id: "public", title: "PolicyLab", productLabel: "政策决策", english: "Public services", audience: "政府与公共机构", icon: "landmark", order: 3,
      subtitle: "比较服务时段与网点安排对办理量、可达性和增量成本的影响。",
      decision: "增设晚间或周末窗口，还是开设社区流动服务点？",
      worldTitle: "社区服务网络", worldSubtitle: "沿着查询、到场与办理流程，比较不同服务资源配置。",
      audienceTitle: "居民构成",
      audienceNote: "居民按行动不便、其他老年居民、通勤上班族、其他常住居民依次归组，彼此互斥。分组仅用于测算服务可达性，不改变服务资格。",
      strategyTitle: "服务资源配置", compareTitle: "比较办理量、重点人群覆盖与预算使用。",
      schemes: [
        { id: "baseline", name: "现行服务窗口", short: "现行窗口", desc: "维持现有服务时段与办理能力，作为比较基线。", tag: "对照" },
        { id: "open", name: "晚间 / 周末延时窗口", short: "延时窗口", desc: "增加非工作时段的办理名额，服务时间受限的居民。", tag: "方案 A" },
        { id: "member", name: "社区流动服务点", short: "流动服务点", desc: "将服务带到社区，减少居民前往固定网点的出行负担。", tag: "方案 B" }
      ],
      controls: [
        control("capacityA", "延时窗口每日新增名额", "range", 0, 300, 10, "人次 / 天", "open", "按计划新增名额计费；每名额每规划日估算 40 元增量运营成本。"),
        control("mobileCapacityB", "流动点每日新增名额", "range", 0, 300, 10, "人次 / 天", "member", "开点固定成本 3,000 元；每名额每规划日另估算 55 元。"),
        control("baseCapacity", "现有窗口日办理能力", "number", 10, 3000, 10, "人次 / 天", "shared", "各方案共用现状基线；既有运营费用不计入增量预算。"),
        control("demand", "日均办理需求", "number", 20, 10000, 10, "人次 / 天", "shared", "每项服务需求按一次办理计数；周期内按日累计。"),
        control("days", "规划周期", "select", 7, 30, 1, "天", "shared", "需求量与新增服务能力按规划天数累计。", periodOptions),
        control("budget", "单方案增量预算", "number", 0, 1000000, 500, "元", "shared", "预算不足时按比例缩减新增名额；现有窗口能力保持不变。")
      ],
      segments4: [
        segment("resident", "其他常住居民", "常规时段可到场", "不属于其他三类的常住居民；情景中多数可在常规时段到场。", 0.90, 0, "离家近、流程清楚，办理会方便很多。"),
        segment("commuter", "通勤上班族", "工作时间与窗口重叠", "工作时段通常与窗口开放时间重叠；晚间或周末服务可能更便利。", 0.48, 1, "下班后也能办理，就不必专门请假。"),
        segment("senior", "其他老年居民", "关注位置与办理指引", "不属于行动不便组；服务位置、现场指引与流程清晰度会影响到场。", 0.66, 2, "路线方便一点，现场有人说明就更安心。"),
        segment("mobility", "行动不便居民", "就近服务更易到达", "前往固定窗口的出行负担较高；社区内服务可能降低到场门槛。", 0.28, 3, "如果服务点在社区附近，我会更方便前往。")
      ],
      objectives: [{ value: "served", label: "增加办理完成量" }, { value: "access", label: "提高重点居民覆盖率" }],
      metrics: [metric("served", "完成办理人次", "人次", "integer", "max", "规划周期内完成的办理总人次。"), metric("completion", "需求完成率", "%", "percent", "max", "已完成办理人次 ÷ 估算服务需求人次。"), metric("access", "重点居民覆盖率", "%", "percent", "max", "老年居民与行动不便居民的完成办理人次 ÷ 两类居民的估算需求人次。"), metric("cost", "增量运营费用", "元", "currency", "min", "方案新增能力的估算运营费用；不含现有窗口成本。")],
      tableMetrics: [metric("served", "完成办理人次", "人次", "integer"), metric("completion", "需求完成率", "%", "percent"), metric("access", "重点居民覆盖率", "%", "percent"), metric("unmet", "未完成需求", "人次", "integer", "min", "估算需求总量减去已完成办理量。"), metric("cost", "增量运营费用", "元", "currency", "min")],
      defaultState: { scheme: "member", objective: "served", weights: [30, 35, 25, 10], params: { capacityA: 80, mobileCapacityB: 90, baseCapacity: 160, demand: 260, days: 14, budget: 80000 } },
      assumptions: [
        "四类居民在现状下的估算到场比例依次为 90%、48%、66%、28%；可完成量同时受窗口办理能力限制。",
        "对尚未完成的需求，延时窗口的可使用比例依次为 25%、75%、15%、10%；社区流动服务依次为 30%、25%、70%、90%。均为待校准的情景假设。",
        "新增名额在可能使用该服务的未完成需求中按比例分配；不减少现有窗口已完成量，也不改变服务资格。",
        "延时窗口按每个计划新增名额每规划日 40 元估算；流动服务另计 3,000 元开点成本，并按每个计划新增名额每规划日 55 元估算。费用按排定能力计，不因实际到场人数减少。",
        "重点居民覆盖率 = 老年居民与行动不便居民的完成办理量 ÷ 两类居民估算需求量。积压消化天数 = 未完成需求 ÷ 当前日办理上限；该指标不等同于现场等候时间，且未计后续新增需求。"
      ],
      validation: ["先匿名汇总到场时段、未办成原因、各窗口能力与居民出行需求。", "选择需求相近的服务点开展分阶段试行，并保持现有服务持续可用。", "同步比较完成办理量、重点居民覆盖率、实际工时与单位增量成本。"]
    }
  ];

  modules.forEach(function (config) {
    config.sections = [{ id: "shared", title: "共同条件", short: "基础设置" }, { id: "open", title: "方案 A", short: "方案 A" }, { id: "member", title: "方案 B", short: "方案 B" }];
    config.metricKeys = config.metrics.map(function (m) { return m.key; });
    config.metricLabels = {};
    config.metrics.concat(config.tableMetrics).forEach(function (m) { config.metricLabels[m.key] = m.label; });
    config.controls.forEach(function (c) { c.default = config.defaultState.params[c.key]; });
    config.defaultState.custom = { enabled: false, name: "我的策略", baseScheme: config.defaultState.scheme === "member" ? "member" : "open", params: {} };
    config.controls.filter(function (c) { return c.scheme; }).forEach(function (c) { config.defaultState.custom.params[c.key] = c.default; });
  });

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function getModule(id) { return modules.find(function (m) { return m.id === id; }) || modules[1]; }
  function defaults(id) { return clone(getModule(id).defaultState); }
  function finite(value, fallback) { var n = Number(value); return Number.isFinite(n) ? n : fallback; }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function sum(values) { return values.reduce(function (a, b) { return a + b; }, 0); }
  function percent(n, d) { return d > 0 ? n / d * 100 : 0; }
  function normalise(id, input) {
    var config = getModule(id), base = defaults(id), raw = input || {}, params = raw.params || raw;
    config.controls.forEach(function (c) {
      if (c.type === "select") {
        var matched = c.options.find(function (option) { return String(option.value) === String(params[c.key]); });
        if (matched) base.params[c.key] = matched.value;
      } else if (params[c.key] !== undefined) {
        base.params[c.key] = clamp(finite(params[c.key], base.params[c.key]), c.min, c.max);
        // Seats and daily counts are discrete. Amounts can retain cents when supplied by an integrator.
        if (["supportAgents", "daily", "demand", "baseCapacity", "capacityA", "mobileCapacityB", "stepsA"].indexOf(c.key) !== -1) base.params[c.key] = Math.round(base.params[c.key]);
      }
    });
    // A custom candidate may change strategy controls, never the shared comparison conditions.
    // Legacy saved studies receive an independent, disabled draft from the module defaults.
    var owns = function (object, key) { return Object.prototype.hasOwnProperty.call(object, key); };
    var custom = owns(raw, "custom") && raw.custom && typeof raw.custom === "object" && !Array.isArray(raw.custom) ? raw.custom : {};
    var customParams = owns(custom, "params") && custom.params && typeof custom.params === "object" && !Array.isArray(custom.params) ? custom.params : {};
    base.custom.enabled = owns(custom, "enabled") && custom.enabled === true;
    if (owns(custom, "name") && typeof custom.name === "string" && custom.name.trim()) base.custom.name = custom.name.trim().slice(0, 40);
    if (owns(custom, "baseScheme") && (custom.baseScheme === "open" || custom.baseScheme === "member")) base.custom.baseScheme = custom.baseScheme;
    config.controls.filter(function (c) { return c.scheme; }).forEach(function (c) {
      if (!owns(customParams, c.key)) return;
      if (c.type === "select") {
        var matched = c.options.find(function (option) { return String(option.value) === String(customParams[c.key]); });
        if (matched) base.custom.params[c.key] = matched.value;
      } else if (customParams[c.key] !== undefined) {
        base.custom.params[c.key] = clamp(finite(customParams[c.key], base.custom.params[c.key]), c.min, c.max);
        if (["supportAgents", "capacityA", "mobileCapacityB", "stepsA"].indexOf(c.key) !== -1) base.custom.params[c.key] = Math.round(base.custom.params[c.key]);
      }
    });
    if (config.schemes.some(function (s) { return s.id === raw.scheme; })) base.scheme = raw.scheme;
    if (raw.scheme === "custom" && base.custom.enabled) base.scheme = "custom";
    if (config.objectives.some(function (o) { return o.value === raw.objective; })) base.objective = raw.objective;
    if (Array.isArray(raw.weights) && raw.weights.length === 4) {
      var weights = raw.weights.map(function (w) { return clamp(finite(w, 0), 0, 100); }), total = sum(weights);
      if (total > 0) base.weights = weights.map(function (w) { return w * 100 / total; });
    }
    return base;
  }
  function rowMeta(config, scheme) { return { id: scheme.id, name: scheme.name, short: scheme.short, tag: scheme.tag }; }
  function groupMeta(seg, population) { return { id: seg.id, name: seg.name, short: seg.short, color: seg.color, population: population, seg: seg }; }

  function merchant(config, state) {
    var p = state.params, reach = p.daily * p.days, populations = state.weights.map(function (w) { return reach * w / 100; });
    var sensitivity = [0.65, 0.24, 0.83, 0.53];
    var rows = config.schemes.map(function (scheme) {
      var discount = Math.min(p.price, scheme.id === "open" ? p.couponA : scheme.id === "member" ? p.couponB : 0);
      var response = config.segments4.map(function (seg) {
        var eligible = scheme.id === "open" || (scheme.id === "member" && ((p.memberTarget === "all" && (seg.id === "active" || seg.id === "dormant")) || p.memberTarget === seg.id));
        var fraction = discount / p.price, index = config.segments4.indexOf(seg);
        var offeredRate = eligible ? Math.min(0.6, seg.base + sensitivity[index] * fraction * (1 - 0.6 * fraction)) : seg.base;
        return { eligible: eligible, rate: offeredRate };
      });
      var fullSpend = sum(response.map(function (r, i) { return r.eligible ? populations[i] * r.rate * discount : 0; }));
      var coverage = fullSpend > 0 ? Math.min(1, p.budget / fullSpend) : 1;
      var groups = config.segments4.map(function (seg, i) {
        var r = response[i], discountedOrders = r.eligible ? populations[i] * r.rate * coverage : 0;
        var regularOrders = populations[i] * seg.base * (r.eligible ? 1 - coverage : 1);
        var orders = discountedOrders + regularOrders, subsidy = discountedOrders * discount;
        return Object.assign(groupMeta(seg, populations[i]), { rate: percent(orders, populations[i]), p: populations[i] ? orders / populations[i] : seg.base, orders: orders, active: r.eligible, eligible: r.eligible, subsidy: subsidy, margin: orders * (p.price - p.cost) - subsidy });
      });
      var orders = sum(groups.map(function (g) { return g.orders; })), subsidy = sum(groups.map(function (g) { return g.subsidy; }));
      var revenue = orders * p.price - subsidy;
      return Object.assign(rowMeta(config, scheme), { orders: orders, rate: percent(orders, reach), revenue: revenue, margin: revenue - p.cost * orders, subsidy: subsidy, cost: subsidy, coverage: coverage, d: discount, groups: groups });
    });
    return { reach: reach, rows: rows, chartKey: state.objective, chartLabel: state.objective === "orders" ? "成交订单数" : "活动贡献毛利", chartUnit: state.objective === "orders" ? "单" : "元" };
  }

  function growth(config, state) {
    var p = state.params, reach = p.daily * p.days, populations = state.weights.map(function (w) { return reach * w / 100; });
    var retentionBase = [0.28, 0.56, 0.68, 0.50], selfUplift = [0.15, 0.14, 0.07, 0.11], selfRetention = [-0.08, -0.03, -0.01, -0.02];
    var assistedUplift = [0.12, 0.22, 0.16, 0.24], assistedRetention = [0.08, 0.10, 0.06, 0.08];
    var rows = config.schemes.map(function (scheme) {
      var reduction = (5 - p.stepsA) / 4, eligibleCount = scheme.id === "open" && reduction > 0 ? reach : scheme.id === "member" ? reach * p.assistedReach / 100 : 0;
      var unitServiceCost = scheme.id === "open" ? 0.35 : 8, staffedCapacity = p.supportAgents * 40 * p.days;
      var covered = scheme.id === "baseline" ? 0 : Math.min(eligibleCount, p.budget / unitServiceCost, scheme.id === "member" ? staffedCapacity : reach);
      var share = covered / reach, cost = covered * unitServiceCost;
      var groups = config.segments4.map(function (seg, i) {
        var activationLift = scheme.id === "open" ? selfUplift[i] * reduction : scheme.id === "member" ? assistedUplift[i] : 0;
        var retentionLift = scheme.id === "open" ? selfRetention[i] * reduction : scheme.id === "member" ? assistedRetention[i] : 0;
        var improvedActivation = clamp(seg.base + activationLift, 0, 1), improvedRetention = clamp(retentionBase[i] + retentionLift, 0, 1);
        var activated = populations[i] * (seg.base * (1 - share) + improvedActivation * share);
        var retained = populations[i] * (seg.base * retentionBase[i] * (1 - share) + improvedActivation * improvedRetention * share);
        return Object.assign(groupMeta(seg, populations[i]), { rate: percent(activated, populations[i]), activated: activated, retained: retained, retention: percent(retained, activated), active: scheme.id !== "baseline" && covered > 0 });
      });
      var activated = sum(groups.map(function (g) { return g.activated; })), retained = sum(groups.map(function (g) { return g.retained; }));
      return Object.assign(rowMeta(config, scheme), { activated: activated, rate: percent(activated, reach), retained: retained, retention: percent(retained, activated), cost: cost, unitCost: activated ? cost / activated : 0, coverage: eligibleCount ? covered / eligibleCount : 1, audienceCoverage: share, covered: covered, groups: groups });
    });
    rows.forEach(function (row) { row.incrementalActivated = row.activated - rows[0].activated; row.incrementalRetained = row.retained - rows[0].retained; });
    return { reach: reach, rows: rows, chartKey: state.objective, chartLabel: state.objective === "activated" ? "完成激活人数" : "7 日留存人数", chartUnit: "人" };
  }

  function publicService(config, state) {
    var p = state.params, reach = p.demand * p.days, populations = state.weights.map(function (w) { return reach * w / 100; });
    var accessible = config.segments4.map(function (seg, i) { return populations[i] * seg.base; });
    var baseCapacity = p.baseCapacity * p.days, baseRatio = sum(accessible) ? Math.min(1, baseCapacity / sum(accessible)) : 0;
    var baselineServed = accessible.map(function (n) { return n * baseRatio; });
    var eveningAccess = [0.25, 0.75, 0.15, 0.10], mobileAccess = [0.30, 0.25, 0.70, 0.90];
    var rows = config.schemes.map(function (scheme) {
      var planned = scheme.id === "open" ? p.capacityA * p.days : scheme.id === "member" ? p.mobileCapacityB * p.days : 0;
      var setup = scheme.id === "member" && planned > 0 ? 3000 : 0, unitSlotCost = scheme.id === "open" ? 40 : 55;
      var addedCapacity = scheme.id === "baseline" ? 0 : Math.max(0, Math.min(planned, (p.budget - setup) / unitSlotCost));
      // Do not open an empty mobile site, even if the budget equals its setup cost.
      var cost = addedCapacity > 0 ? setup + addedCapacity * unitSlotCost : 0;
      var available = populations.map(function (n, i) {
        var useRate = scheme.id === "open" ? eveningAccess[i] : scheme.id === "member" ? mobileAccess[i] : 0;
        return Math.max(0, n - baselineServed[i]) * useRate;
      });
      var allocation = sum(available) ? Math.min(1, addedCapacity / sum(available)) : 0;
      var groups = config.segments4.map(function (seg, i) {
        var served = baselineServed[i] + available[i] * allocation;
        return Object.assign(groupMeta(seg, populations[i]), { served: served, completion: percent(served, populations[i]), rate: percent(served, populations[i]), unmet: Math.max(0, populations[i] - served), active: scheme.id !== "baseline" && addedCapacity > 0 });
      });
      var served = sum(groups.map(function (g) { return g.served; })), unmet = Math.max(0, reach - served);
      var focusDemand = populations[2] + populations[3], focusServed = groups[2].served + groups[3].served;
      return Object.assign(rowMeta(config, scheme), { served: served, completion: percent(served, reach), rate: percent(served, reach), access: percent(focusServed, focusDemand), unmet: unmet, cost: cost, pressure: unmet / ((baseCapacity + addedCapacity) / p.days), coverage: planned ? addedCapacity / planned : 1, capacity: baseCapacity + addedCapacity, addedCapacity: addedCapacity, unusedCapacity: Math.max(0, addedCapacity - sum(available) * allocation), groups: groups });
    });
    return { reach: reach, rows: rows, chartKey: state.objective, chartLabel: state.objective === "access" ? "重点居民覆盖率" : "完成办理人次", chartUnit: state.objective === "access" ? "%" : "人次" };
  }

  function compute(moduleId, input) {
    var config = getModule(moduleId), state = normalise(config.id, input);
    var model = config.id === "growth" ? growth : config.id === "public" ? publicService : merchant;
    var result = model(config, state);
    var customEffectiveParams = Object.assign({}, state.params, state.custom.params);
    if (state.custom.enabled) {
      var customState = Object.assign({}, state, { scheme: state.custom.baseScheme, params: customEffectiveParams });
      var customRow = model(config, customState).rows.find(function (row) { return row.id === state.custom.baseScheme; });
      result.rows.push(Object.assign({}, customRow, { id: "custom", name: state.custom.name, short: state.custom.name, tag: "我的策略", sceneScheme: state.custom.baseScheme }));
    }
    var best = result.rows.reduce(function (a, b) {
      var diff = b[state.objective] - a[state.objective];
      return diff > 1e-9 || (Math.abs(diff) <= 1e-9 && b.cost < a.cost - 1e-9) ? b : a;
    }, result.rows[0]);
    var selected = result.rows.find(function (r) { return r.id === state.scheme; }) || result.rows[0];
    var selectedScheme = selected.sceneScheme || selected.id;
    var selectedParams = selected.id === "custom" ? customEffectiveParams : Object.assign({}, state.params);
    var objectiveLabel = config.objectives.find(function (o) { return o.value === state.objective; }).label;
    var notes = [];
    if (selected.coverage < 0.999999) notes.push(config.id === "growth" ? "当前方案受预算或服务能力限制，实际覆盖已相应缩减。" : "当前预算无法覆盖全部计划，测算已按可承担规模调整。");
    if (config.id === "merchant" && selectedParams.cost > selectedParams.price) notes.push("单件变动成本高于售价，原价销售也会产生负贡献毛利。请核对售价与成本。");
    if (config.id === "merchant" && ((selectedScheme === "open" && selectedParams.couponA > selectedParams.price) || (selectedScheme === "member" && selectedParams.couponB > selectedParams.price))) notes.push("优惠金额已按商品售价封顶，实付价格最低为 0 元。");
    if (config.id === "growth") notes.push("7 日留存按用户激活后单独计时，完整观察期为进入窗口结束后再加 7 天。");
    if (config.id === "public" && selected.unusedCapacity > 0.01) notes.push("部分新增名额没有对应的可到场需求；已安排的名额仍计入运营费用。");
    if (config.id === "public" && state.weights[2] + state.weights[3] === 0) notes.push("当前未配置老年居民或行动不便居民，重点居民覆盖率按 0 显示，不代表整体服务质量。");
    notes.push("情景测算基于当前参数与预设响应规则；可用于比较方案，实际实施前应以业务数据校准并验证。");
    var recommendation = best.id === "baseline" ? "当前假设下，保留现有方案更符合「" + objectiveLabel.replace(/^提高/, "") + "」目标。可继续调整资源与客群结构。" : "优先验证「" + best.name + "」。在当前假设下，它更符合「" + objectiveLabel.replace(/^提高/, "") + "」目标。";
    return Object.assign(result, { moduleId: config.id, state: state, selected: selected, selectedParams: selectedParams, selectedScheme: selectedScheme, best: best, metrics: config.metrics, tableMetrics: config.tableMetrics, recommendation: recommendation, notes: notes, assumptions: config.assumptions, validation: config.validation });
  }

  global.YanceScenarios = { modules: modules, compute: compute, defaults: defaults, normalise: normalise, getModule: getModule, version: "1.1.0" };
})(typeof window !== "undefined" ? window : globalThis);
