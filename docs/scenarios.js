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
      id: "growth", title: "企业增长", english: "Product growth", icon: "chart-no-axes-combined", order: 1,
      subtitle: "让每一次产品改动，都更接近持续增长。",
      decision: "缩短注册引导，还是增加人工陪伴，才能留住更多新用户？",
      worldTitle: "产品体验街区", worldSubtitle: "从发现、体验到持续使用，观察不同用户的选择。",
      audienceTitle: "理解动机，设计更合适的产品路径。",
      audienceNote: "按用户本次进入产品的主要状态分组；同一用户只计入一类。真实应用需由行为数据定义分组。",
      strategyTitle: "新用户激活路径", compareTitle: "从完成激活，到留下来。",
      schemes: [
        { id: "baseline", name: "现有注册引导", short: "现状", desc: "保留五步引导与现有自助流程，作为比较基线。", tag: "对照" },
        { id: "open", name: "轻量自助引导", short: "轻量引导", desc: "减少首次使用步骤，让用户更快触达核心价值。", tag: "方案 A" },
        { id: "member", name: "顾问陪伴激活", short: "顾问陪伴", desc: "为部分新用户提供一对一引导，受服务席位与预算约束。", tag: "方案 B" }
      ],
      controls: [
        control("stepsA", "首次引导步骤", "range", 1, 5, 1, "步", "open", "现状为 5 步。更短的路径降低阻力，也可能减少对产品的理解。"),
        control("assistedReach", "计划陪伴比例", "range", 0, 100, 5, "%", "member", "实际覆盖同时受顾问接待能力和预算限制。"),
        control("supportAgents", "可用顾问席位", "number", 1, 50, 1, "席", "member", "每席每天最多服务 40 人；按实际安排的服务人次计算费用。"),
        control("daily", "每日新进入用户", "number", 50, 50000, 50, "人 / 天", "shared", "三组使用相同规模、相同结构的进入用户。"),
        control("days", "用户进入窗口", "select", 7, 30, 1, "天", "shared", "7 日留存从各用户激活后计算，完整观测须再等待 7 天。", periodOptions),
        control("budget", "单方案服务预算", "number", 0, 1000000, 500, "元", "shared", "A 的自助服务为 0.35 元 / 覆盖用户；B 的顾问服务为 8 元 / 人次。")
      ],
      segments4: [
        segment("explore", "首次探索者", "先看看是否适合", "尚未确定使用目标，更容易因步骤冗长离开。", 0.12, 0, "先让我体验一下，再决定是否继续。"),
        segment("intent", "明确需求者", "带着具体任务而来", "目标清楚，期待快速完成第一次核心操作。", 0.30, 1, "我希望直接解决眼前这个问题。"),
        segment("migrate", "熟练迁移者", "已有同类工具经验", "熟悉工作方式，更看重迁移效率与能力匹配。", 0.52, 2, "把已有工作迁过来，会不会很麻烦？"),
        segment("return", "回访未激活者", "需要一个继续的理由", "曾经访问但尚未完成核心动作，需要消除具体阻碍。", 0.38, 3, "上次卡住的地方，这次有人帮我吗？")
      ],
      objectives: [{ value: "retained", label: "提高 7 日留存人数" }, { value: "activated", label: "提高完成激活人数" }],
      metrics: [
        metric("activated", "完成激活", "人", "integer"),
        metric("rate", "激活转化率", "%", "percent"),
        metric("retained", "7 日留存人数", "人", "integer"),
        metric("unitCost", "每激活服务成本", "元 / 人", "currency", "min", "本方案增量服务费用 ÷ 全部激活人数；不含获客与既有平台成本。")
      ],
      tableMetrics: [metric("activated", "激活人数", "人", "integer"), metric("rate", "激活率", "%", "percent"), metric("retained", "7 日留存", "人", "integer"), metric("retention", "激活后留存率", "%", "percent"), metric("cost", "服务费用", "元", "currency", "min")],
      defaultState: { scheme: "open", objective: "retained", weights: [35, 30, 20, 15], params: { stepsA: 2, assistedReach: 40, supportAgents: 4, daily: 1000, days: 14, budget: 30000 } },
      assumptions: [
        "各客群激活基线为 12%、30%、52%、38%；激活后的 7 日留存基线为 28%、56%、68%、50%。均为可供讨论的情景假设。",
        "自助步骤由 5 步缩短至 1 步时，四类客群的激活率分别最多增加 15、14、7、11 个百分点；激活后留存率分别减少 8、3、1、2 个百分点。",
        "顾问完整覆盖时，四类客群的激活率分别增加 12、22、16、24 个百分点，激活后留存率分别增加 8、10、6、8 个百分点。",
        "顾问覆盖人数不超过计划比例、每席每日 40 人的能力与预算可承担人数三者中的最小值。自助引导按覆盖用户计费；预算不足时仅部分用户进入新路径。",
        "费用只含本方案增量服务费用。未计广告获客、开发投入、既有平台、固定人员与其他运营成本；不把每激活服务成本称为完整获客成本。"
      ],
      validation: ["以用户为单位随机分流，固定新用户资格与激活事件。", "同时监测激活率、激活后 7 日留存、支持工时与投诉。", "按各组最后一名用户的激活日期补足 7 日观察窗口，再比较结果。"]
    },
    {
      id: "merchant", title: "商户经营", english: "Merchant operations", icon: "store", order: 2,
      subtitle: "把经营直觉，变成有依据的下一步。",
      decision: "新品首发，选择全员礼遇还是会员专享，才能兼顾成交与毛利？",
      worldTitle: "南岸生活街区", worldSubtitle: "一间新店、四类顾客，以及一次值得推敲的经营决策。",
      audienceTitle: "看清来到门店的人，再决定怎样邀请。",
      audienceNote: "会员按最近购买时间分为活跃与沉睡；非会员新客再按主要购买动机分为优惠与品质导向。四类互斥。",
      strategyTitle: "新品上市礼遇", compareTitle: "成交之外，看见每一笔毛利。",
      schemes: [
        { id: "baseline", name: "原价上市", short: "原价上市", desc: "保留自然购买需求，不额外提供优惠。", tag: "对照" },
        { id: "open", name: "全员尝新礼遇", short: "全员礼遇", desc: "对全部客群开放首单礼遇，扩大新品尝试。", tag: "方案 A" },
        { id: "member", name: "会员专属礼遇", short: "会员专享", desc: "将预算集中于选定会员，观察复购与唤回。", tag: "方案 B" }
      ],
      controls: [
        control("couponA", "全员每单礼遇", "range", 0, 40, 1, "元", "open", "每位顾客至多一单；礼遇不会超过商品售价。"),
        control("couponB", "会员每单礼遇", "range", 0, 40, 1, "元", "member", "只对选定会员群体开放，和全员方案独立调整。"),
        control("memberTarget", "会员礼遇对象", "select", null, null, null, "", "member", "会员分类以最近一次购买时间划分。", [{ value: "all", label: "全部会员" }, { value: "active", label: "活跃会员" }, { value: "dormant", label: "沉睡会员" }]),
        control("price", "商品售价", "number", 1, 9999, 1, "元 / 件", "shared", "三种方案使用同一商品售价。"),
        control("cost", "单件变动成本", "number", 0, 9999, 1, "元 / 件", "shared", "可包含采购、包装和履约；不含固定租金。"),
        control("daily", "每日触达顾客", "number", 20, 50000, 10, "人 / 天", "shared", "窗口内按独立顾客计数，每人至多购买一件。"),
        control("days", "活动周期", "select", 7, 30, 1, "天", "shared", "三组使用相同活动窗口。", periodOptions),
        control("budget", "单方案礼遇预算", "number", 0, 1000000, 500, "元", "shared", "仅核销的礼遇计入费用；余额不会被计为成本。")
      ],
      segments4: [
        segment("value", "优惠导向新客", "价格清楚，才愿尝试", "尚非会员，对实付价格敏感，希望礼遇简单直接。", 0.045, 0, "价格合适、优惠直接可用，我会愿意试试。"),
        segment("quality", "品质导向新客", "先理解产品的价值", "尚非会员，更关注品质、服务与新品体验。", 0.065, 1, "先了解产品，再决定是否值得购买。"),
        segment("active", "活跃会员", "熟悉品牌，常来常往", "近 30 天有购买记录，重视稳定体验与会员权益。", 0.105, 2, "我会留意新品，专属礼遇会增加吸引力。"),
        segment("dormant", "沉睡会员", "需要一个回来的理由", "31–180 天未购买，对重新尝试持观望态度。", 0.035, 3, "一个清楚的回归理由，会让我再来看看。")
      ],
      objectives: [{ value: "margin", label: "提高活动贡献毛利" }, { value: "orders", label: "提高成交订单数" }],
      metrics: [metric("rate", "购买转化率", "%", "percent"), metric("revenue", "实收销售额", "元", "currency"), metric("margin", "活动贡献毛利", "元", "currency"), metric("subsidy", "已用礼遇预算", "元", "currency", "min")],
      tableMetrics: [metric("orders", "成交订单", "单", "integer"), metric("rate", "转化率", "%", "percent"), metric("revenue", "实收", "元", "currency"), metric("margin", "贡献毛利", "元", "currency"), metric("subsidy", "礼遇费用", "元", "currency", "min")],
      defaultState: { scheme: "open", objective: "margin", weights: [35, 25, 25, 15], params: { couponA: 8, couponB: 15, memberTarget: "all", price: 59, cost: 24, daily: 715, days: 14, budget: 8000 } },
      assumptions: [
        "四类客群的原价转化率分别为 4.5%、6.5%、10.5%、3.5%。价格响应为预设的情景参数，需用真实经营数据校准。",
        "礼遇影响按折扣占售价的比例计算，并设置边际递减；获券顾客的购买概率最高为 60%。每人至多购买一件。",
        "预算不足时按同一比例减少符合资格人群的发券覆盖；未获券人群保持原价购买概率。实际核销费用不会超过预算。",
        "实收 = 售价 × 订单 − 已核销礼遇；贡献毛利 = 实收 − 单件变动成本 × 订单。礼遇只扣减一次，未花费预算不扣减。",
        "贡献毛利不等于净利润；此处未计租金、获客、税费、退货与长期复购，不输出统计置信区间。"
      ],
      validation: ["预先固定会员定义、发券资格、预算耗尽规则与活动窗口。", "以每名触达顾客的贡献毛利为主指标，同时观察订单与退款。", "三组同时随机分流，结合历史波动计算样本量后再作经营决策。"]
    },
    {
      id: "public", title: "公共服务", english: "Service planning", icon: "landmark", order: 3,
      subtitle: "让有限的服务资源，回应更多真实需要。",
      decision: "延长服务时间，还是增设流动服务点，能够更好地缓解办理压力？",
      worldTitle: "邻里服务街区", worldSubtitle: "围绕服务时间、办理能力与出行便利，比较不同资源安排。",
      audienceTitle: "从不同生活节奏出发，安排服务资源。",
      audienceNote: "分组顺序为行动不便、其余老年居民、其余通勤上班族、其余常住居民；用于服务安排，不作为享受服务的资格条件。",
      strategyTitle: "便民服务资源安排", compareTitle: "服务增量，也要关照可达性。",
      schemes: [
        { id: "baseline", name: "现有服务窗口", short: "现有窗口", desc: "沿用常规营业时间与现有办理能力。", tag: "对照" },
        { id: "open", name: "延时便民窗口", short: "延时窗口", desc: "增加晚间或周末办理时段，方便时间受限的居民。", tag: "方案 A" },
        { id: "member", name: "社区流动服务", short: "流动服务", desc: "将办理点前移至社区，降低出行门槛。", tag: "方案 B" }
      ],
      controls: [
        control("capacityA", "延时新增办理能力", "range", 0, 300, 10, "人次 / 天", "open", "每个新增办理名额按 40 元增量运营成本估算。"),
        control("mobileCapacityB", "流动点新增能力", "range", 0, 300, 10, "人次 / 天", "member", "流动点开设成本 3,000 元，每个名额另计 55 元。"),
        control("baseCapacity", "现有每日办理能力", "number", 10, 3000, 10, "人次 / 天", "shared", "三组共享同一现状基线；现有运营成本不计入增量预算。"),
        control("demand", "每日新增服务需求", "number", 20, 10000, 10, "人次 / 天", "shared", "窗口内每个需求按一次办理计数。"),
        control("days", "规划周期", "select", 7, 30, 1, "天", "shared", "需求量与服务能力在周期内按日累计。", periodOptions),
        control("budget", "单方案增量预算", "number", 0, 1000000, 500, "元", "shared", "预算不足时缩减新增能力；不影响现有窗口的基线能力。")
      ],
      segments4: [
        segment("resident", "常住居民", "时间安排相对灵活", "不属于其他三类，通常可以在常规时段到场。", 0.90, 0, "在附近、流程清楚，就比较方便。"),
        segment("commuter", "通勤上班族", "工作时间与窗口重叠", "常规工作时段不便办理，受益于晚间与周末服务。", 0.48, 1, "如果下班后也能办，就不用专门请假。"),
        segment("senior", "老年居民", "需要更近、更清晰的服务", "不属于行动不便组，更重视位置、引导与办理便利。", 0.66, 2, "服务点近一些，有人讲清楚会更好。"),
        segment("mobility", "行动不便居民", "出行便利是关键", "到达常规窗口的门槛较高，关注社区就近办理。", 0.28, 3, "希望在社区里就能把事情办好。")
      ],
      objectives: [{ value: "served", label: "提高办理完成总量" }, { value: "access", label: "提高重点人群服务覆盖" }],
      metrics: [metric("served", "完成办理", "人次", "integer"), metric("completion", "需求完成率", "%", "percent"), metric("access", "重点人群覆盖", "%", "percent", "max", "老年与行动不便两类需求中已完成办理的比例。"), metric("cost", "增量运营费用", "元", "currency", "min")],
      tableMetrics: [metric("served", "完成办理", "人次", "integer"), metric("completion", "完成率", "%", "percent"), metric("access", "重点人群覆盖", "%", "percent"), metric("unmet", "剩余需求", "人次", "integer", "min"), metric("cost", "增量费用", "元", "currency", "min")],
      defaultState: { scheme: "member", objective: "served", weights: [30, 35, 25, 10], params: { capacityA: 80, mobileCapacityB: 90, baseCapacity: 160, demand: 260, days: 14, budget: 80000 } },
      assumptions: [
        "现状下四类居民能够到场的需求比例分别为 90%、48%、66%、28%；实际办理受窗口总能力限制。",
        "在未完成需求中，延时窗口的可使用比例分别为 25%、75%、15%、10%；社区流动服务分别为 30%、25%、70%、90%。这些比例是待校准的情景假设。",
        "新增名额在能够使用该服务的剩余需求之间按比例分配，不改变现有窗口已完成的办理，不设置差别资格或剥夺既有服务。",
        "延时窗口每个计划名额成本 40 元；流动服务先支出 3,000 元开设成本，再按每个计划名额 55 元估算。按已安排的能力计费，不以实际到场人数冲减排班费用。",
        "重点人群覆盖率 = 老年与行动不便居民完成量 ÷ 两类需求量。积压消化天数 = 剩余需求 ÷ 当前日服务上限，仅衡量压力，未计后续新需求，不是现场等候时间。"
      ],
      validation: ["先对现有到场时段、未办成原因与各窗口能力进行匿名汇总。", "选择相近服务点或分阶段试行，保持既有服务可用。", "同时比较办理总量、重点人群覆盖、实际工时与单位增量成本。"]
    }
  ];

  modules.forEach(function (config) {
    config.sections = [{ id: "shared", title: "共同条件", short: "基础设置" }, { id: "open", title: "方案 A", short: "方案 A" }, { id: "member", title: "方案 B", short: "方案 B" }];
    config.metricKeys = config.metrics.map(function (m) { return m.key; });
    config.metricLabels = {};
    config.metrics.concat(config.tableMetrics).forEach(function (m) { config.metricLabels[m.key] = m.label; });
    config.controls.forEach(function (c) { c.default = config.defaultState.params[c.key]; });
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
    if (config.schemes.some(function (s) { return s.id === raw.scheme; })) base.scheme = raw.scheme;
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
    return { reach: reach, rows: rows, chartKey: state.objective, chartLabel: state.objective === "access" ? "重点人群服务覆盖" : "完成办理人次", chartUnit: state.objective === "access" ? "%" : "人次" };
  }

  function compute(moduleId, input) {
    var config = getModule(moduleId), state = normalise(config.id, input);
    var result = config.id === "growth" ? growth(config, state) : config.id === "public" ? publicService(config, state) : merchant(config, state);
    var best = result.rows.reduce(function (a, b) {
      var diff = b[state.objective] - a[state.objective];
      return diff > 1e-9 || (Math.abs(diff) <= 1e-9 && b.cost < a.cost - 1e-9) ? b : a;
    }, result.rows[0]);
    var selected = result.rows.find(function (r) { return r.id === state.scheme; }) || result.rows[0];
    var objectiveLabel = config.objectives.find(function (o) { return o.value === state.objective; }).label;
    var notes = [];
    if (selected.coverage < 0.999999) notes.push(config.id === "growth" ? "当前方案受预算或服务能力限制，实际覆盖已相应缩减。" : "当前预算无法覆盖全部计划，测算已按可承担规模调整。");
    if (config.id === "merchant" && state.params.cost > state.params.price) notes.push("单件变动成本高于售价，原价销售也会产生负贡献毛利。请核对售价与成本。");
    if (config.id === "merchant" && ((selected.id === "open" && state.params.couponA > state.params.price) || (selected.id === "member" && state.params.couponB > state.params.price))) notes.push("礼遇金额已按商品售价封顶，实付价格最低为 0 元。");
    if (config.id === "growth") notes.push("7 日留存按用户激活后单独计时，完整观察期为进入窗口结束后再加 7 天。");
    if (config.id === "public" && selected.unusedCapacity > 0.01) notes.push("部分新增名额没有对应的可到场需求；已安排的名额仍计入运营费用。");
    if (config.id === "public" && state.weights[2] + state.weights[3] === 0) notes.push("当前未配置老年或行动不便客群，重点人群覆盖率按 0 显示，不代表服务质量。");
    notes.push("情景测算基于当前参数与预设响应规则；可用于比较方案，实际实施前应以业务数据校准并验证。");
    var recommendation = best.id === "baseline" ? "当前假设下，保留现有方案更符合「" + objectiveLabel.replace(/^提高/, "") + "」目标。可继续调整资源与客群结构。" : "优先验证「" + best.name + "」。在当前假设下，它更符合「" + objectiveLabel.replace(/^提高/, "") + "」目标。";
    return Object.assign(result, { moduleId: config.id, state: state, selected: selected, best: best, metrics: config.metrics, tableMetrics: config.tableMetrics, recommendation: recommendation, notes: notes, assumptions: config.assumptions, validation: config.validation });
  }

  global.YanceScenarios = { modules: modules, compute: compute, defaults: defaults, normalise: normalise, getModule: getModule, version: "1.0.0" };
})(typeof window !== "undefined" ? window : globalThis);
