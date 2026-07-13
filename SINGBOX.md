# BestClash 转 sing-box 配置说明

本仓库的 `proxies.yaml` 是 **Clash / Mihomo 订阅格式**，sing-box 内核不原生支持，必须先转换再使用。
本文档记录转换方式、生成的三个配置版本及其用法。

## 转换工具

使用 [SubBridge](https://github.com/zzf2333/SubBridge)（`@0xsnx/subbridge`），模板驱动，默认输出的 DNS 段即为 **sing-box 1.12+ 新格式**（无 `legacy dns` 警告）。

```bash
npm install -g @0xsnx/subbridge
subbridge build -i proxies.yaml -i extra.yaml -o singbox-config.json
```

> 注：SubBridge 0.3.0 默认模板会写入 `independent_cache`（sing-box 1.14.0 已废弃），本仓库的后处理脚本 `scripts/enrich-singbox.js` 自动删除它并应用多项优化。

## 自动构建

本仓库通过 **GitHub Actions**（`.github/workflows/main.yaml`）每 30 分钟自动执行一次完整构建链：

```
curl 上游 PuddinCat proxies.yaml  ─┐
                                   ├→ subbridge build → node enrich-singbox.js → git commit+push
curl 免费池 Ruk1ng001/freeSub ────┘
```

构建失败时（如免费源宕机）自动降级为仅用上游源构建，不影响配置产出。

## 节点来源

| 源 | 协议 | 节点数 | 更新频率 |
| --- | --- | --- | --- |
| [PuddinCat/BestClash](https://github.com/PuddinCat/BestClash) | trojan / hysteria2 / shadowsocks | 16 | 30 分钟 |
| [Ruk1ng001/freeSub](https://github.com/Ruk1ng001/freeSub) | vless / vmess / trojan / socks / hysteria2 / shadowsocks | ~109 | 每日 |
| **合计** | | **≈125** | **30 分钟自动构建** |

合并后任意版本均可分配到所有节点。

## 四个配置版本

仓库内提供四版，互相独立、可并存，按需选用：

| 文件 | 定位 | 规则集来源 |
| --- | --- | --- |
| `singbox-config.json` | 基础 / 推荐版 | MetaCubeX：`geosite-cn` / `geoip-cn` / `geosite-ads` |
| `singbox-config-cn.json` | 国内增强版 | 基础版 + **Repcz** 现成国内集（`ChinaDomain` / `ChinaIP` / `Ads_EasyListChina`） |
| `singbox-config-geo.json` | 地区分流版 | 增强版 + 按服务流媒体路由（见下） |
| `singbox-config-geo-pro.json` | 职业版 | 地区分流版 + FakeIP + Clash API + strict_route (见下) |

四版均包含约 **125 个节点**（上游 16 + 免费池 109，协议覆盖 trojan / vless / vmess / hysteria2 / shadowsocks / socks），按国家分组（🇺🇸🇩🇪🇬🇧🇫🇷🇳🇱🇷🇺🇮🇳 的 selector / urltest）、tun 入站、DNS 与基础路由。此外通过后处理脚本自动应用了多项优化：`cache_file` 持久化节点选择、TUN `stack: system`、DNS `prefer_ipv4` 与备选 DNS、NTP 时间同步、`sniff_override_destination`、trojan 节点 TLS UTLS Chrome 指纹、hysteria2 `tls.enabled`、`tcp_fast_open` 等。

### 地区分流版路由逻辑

在「国内直连 / 广告拦截」之上，额外把流媒体按版权地区锁定节点，比一律走 `final`（🚀节点）更稳：

- Netflix / Disney+ / Prime Video / Hulu / HBO / Spotify → 🇺🇸 美国
- BBC → 🇬🇧 英国
- bilibili → direct（国内直连）
- openai / youtube / google 等 → 走 `final`（🚀节点）

### 职业版（`singbox-config-geo-pro.json`）额外特性

在地区分流版基础上新增：

- **FakeIP**（`198.18.0.0/15`）— DNS 查询全部返回虚拟 IP，减少 DNS 泄漏与查询延迟
- **Clash API**（`:9090`）— 提供 RESTful API，可在仪表盘切换节点、查看流量
- **`strict_route`** — 禁止非本机流量经过 TUN，防止路由环路
- **DNS block server**（`rcode://success`）— 广告域名直接返回空响应，而非走代理

推荐搭配 **FakeIP 缓存**：`cache_file` 会记住 IP→域名映射，重启后不走重复解析。

## 使用方法

### 1. 选版本

- 只想国内直连 + 基础广告拦截 → `singbox-config.json`
- 想要更全的国内域名 / IP 白名单与国内广告拦截 → `singbox-config-cn.json`
- 想让流媒体按版权地区走对应国家节点（如 Netflix 走美国）→ `singbox-config-geo.json`
- 需要 FakeIP + Clash API 管理面板 → `singbox-config-geo-pro.json`

### 2. 命令行 sing-box（原生）

将所选文件作为 `config.json` 放入配置目录后启动：

```bash
# 例：用地区分流版
cp singbox-config-geo.json ~/.config/sing-box/config.json
sing-box run
# 或指定路径：sing-box run -c ~/.config/sing-box/config.json
```

### 3. GUI 客户端（各平台）

主流 sing-box GUI（NekoBox、sing-box for Android、SFI、Stash 等）均支持「本地文件导入」或「订阅链接」：

- **本地导入**：在客户端里选择「导入本地配置 / 从文件加载」，指向仓库里的 `singbox-config-*.json`。
- **订阅链接**：若仓库部署了可访问的 URL，把
  `  https://raw.githubusercontent.com/bzfq21/BestClash/refs/heads/main/singbox-config-geo.json`
  作为订阅地址填入（按需替换文件名）。

### 4. 验证

启动后查看日志：本仓库四版均为 **1.12+ 格式**，正常应**无 `legacy dns` 警告**；若出现，说明客户端内核过旧，请升级到支持 1.12+ 的 sing-box 版本。

## 注意事项

- 四版均为 **sing-box 1.12+ 格式，无 `legacy dns`**，适用于当前主流 sing-box / GUI 客户端。
- `route.rule_set` 中的 `.srs` 规则集通过 `download_detour: "direct"` 从 **testingcf.jsdelivr.net（jsdelivr CDN）**拉取 —— **客户端需能访问 jsdelivr CDN**。若网络无法直接拉取，可将该字段改为走代理的节点 tag，或预先下载 `.srs` 改为本地 `path` 引用。
- 原 `proxies.yaml` **未改动**，Clash / Mihomo 用户继续用原订阅即可。
- 原 Clash 约 10000 条 `rules` **未逐条转换**：按你的要求改用 GitHub 现成规则集（MetaCubeX / Repcz）替代，零手工转译、零维护成本。
- `route.rules` 里使用的 `outbound` 字段是 1.12+ 标准用法，与 `dns.rules` 里已废弃的 `outbound` 旧写法无关，不会触发 `legacy dns` 警告。

## 规则集来源

- **MetaCubeX/meta-rules-dat**：`geosite-cn` / `geoip-cn` / `geosite-ads`，及按服务命名的 `netflix` / `disney` / `primevideo` / `hulu` / `hbo` / `spotify` / `bbc` / `bilibili` 等 `.srs`。
- **Repcz/Tool**：`ChinaDomain`（国内域名白名单）、`ChinaIP`（国内 IP）、`Ads_EasyListChina`（国内广告）。
- **Ruk1ng001/freeSub**：额外免费节点池（vless / vmess / trojan / socks / hysteria2 / ss），与上游合并后约 125 节点。

## 注意事项

- 免费节点来自公共订阅池，**稳定性与速度不保证**，建议配合 `urltest`（自动测速）使用。

## 关于仓库地址

本仓库的 Git remote 设置：

- `origin` → `bzfq21/BestClash`（你自己的仓库）：sing-box 配置（`singbox-config-*.json`）、本文档等新增文件都在这里，文档里的配置链接也用它。
- `upstream` → `PuddinCat/BestClash`（原项目）：**仅用于从上游同步 `proxies.yaml` 等订阅更新**，不在此修改。

因此 README 的订阅地址沿用 `PuddinCat/BestClash`（跟随上游源），而本文档的 sing-box 配置链接使用你自己的 `bzfq21/BestClash`。
