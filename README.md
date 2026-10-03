# 智演 ZHIYAN

智演是一套把经营、增长和公共服务方案放进可观察城市场景的决策预演工作台。它帮助团队比较不同方案、看见人群路径和资源边界，再决定下一步真实验证什么。

线上地址暂时保留历史仓库路径：[yance-decision-studio](https://kzczc.github.io/yance-decision-studio/)。本地项目目录已统一为 `outputs/zhiyan-decision-studio`。

## 产品结构

| 产品 | 面向对象 | 预演问题 |
| --- | --- | --- |
| `PolicyLab` | 政府与公共机构 | 服务网点、开放时段与居民可达性 |
| `GrowthLab` | 企业与业务团队 | 新用户引导、产品体验与激活留存 |
| `BizLab` | 店主与个体经营者 | 新品促销、客流响应与贡献毛利 |

每个 Lab 都有独立的人群、策略、地图、设施和结果口径。

## 当前能力

- 三类 Lab、12 张独立地图；道路、建筑、设施和人物路线随地图切换。
- 可填写情境背景，并识别地图、天气、光照、客流节奏和设施倾向。
- 可选择、定位和跟随观察对象；拖动地图会自动退出跟随。
- 策略比较、指标卡、结果解读、完整指标表和验证计划。
- 保存研究、恢复场景、导出 HTML 报告、CSV 表格与打印报告。
- 桌面、平板和手机响应式布局；支持字号、密度、场景尺寸、播放速度等偏好。
- 城市地图、卡通 Lab 插画、品牌路径图形、高清地图文字和统一语义图标。

## 本地运行

在项目根目录执行：

```powershell
node work/serve.cjs
```

然后访问 <http://127.0.0.1:61320/>。静态入口位于 `outputs/zhiyan-decision-studio/docs/index.html`。

## 目录说明

- `docs/`：GitHub Pages 静态网站。
- `docs/app.js`：工作台交互、保存恢复、报告导出和导航。
- `docs/scenarios.js`：三类产品的确定性假设模型。
- `docs/town.js`：像素城市、人物路径、设施和场景动画。
- `docs/maps.js`：12 张地图的路网、建筑和设施配置。
- `docs/assets/`：字体、图标、品牌资产、地图素材和许可文件。
- `DEMO-RECORDING.md`：演示片分镜、旁白和录制准备。

## Demo 录制

独立录制脚本位于项目外层的 `work/record-demo.cjs`。它只控制浏览器，不改变产品代码：

```powershell
node work/serve.cjs
node work/record-demo.cjs
```

输出位于 `work/recordings/`：

- `zhiyan-demo-3min.webm`：1920 × 1080 高清录屏。
- `zhiyan-demo-subtitles.vtt`：章节字幕。
- `zhiyan-demo-chapters.json`：章节时间索引。

当前主片按“问题 → 情境预演 → 方案比较 → 下一步验证”组织，主线是 BizLab，另有 PolicyLab 和 GrowthLab 补充镜头。

## 数据和方法边界

当前版本是完整的静态前端产品体验。行业场景使用透明、确定性的预设假设，没有连接后台多智能体推理或真实业务数据。地图人物是行为可视化样本，不等同于实际用户总量。

真实项目实施前，需要使用获授权的数据校准模型，并通过 A/B 测试、现场试点或其他真实实验验证结果。

场景构成只改变可视化预演，不直接改变业务指标；研究记录保存在当前浏览器的 localStorage，不上传服务器。

## 字体、素材与许可

- 中文界面：霞鹜文楷屏幕版，见 `docs/assets/WENKAI-LICENSE.txt`。
- 标题和正文子集均包含智演品牌所需字符，字体由 `work/build-screen-fonts.py` 从本地字库生成。
- 英文与数字：Inter，见 `docs/assets/INTER-LICENSE.txt`。
- 图标：Lucide，见 `docs/assets/ICON-LICENSE.txt`。
- 像素地形：Kenney Tiny Town，CC0，见 `docs/assets/pixel-town-license.txt`。
- Lab 插画、城市路径图形、人物、地图编排和交互为本项目制作。

智演 / ZHIYAN 的名称和品牌符号尚未完成商标可用性核验。远端仓库与 Pages URL 暂保留历史路径，以保证已有链接继续可用。
