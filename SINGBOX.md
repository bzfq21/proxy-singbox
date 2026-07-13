# BestClash 转 sing-box 配置说明

本仓库的 `proxies.yaml` 是 **Clash / Mihomo 订阅格式**，sing-box 内核不原生支持，必须先转换再使用。
本文档记录转换方式、生成的三个配置版本及其用法。

## 转换工具

使用 [SubBridge](https://github.com/zzf2333/SubBridge)（`@0xsnx/subbridge`），模板驱动，默认输出的 DNS 段即为 **sing-box 1.12+ 新格式**（无 `legacy dns` 警告）。

```bash
npm install -g @0xsnx/subbridge
subbridge build -i proxies.yaml -o singbox-config.json
```

> 注：SubBridge 0.3.0 默认模板会写入 `independent_cache`（sing-box 1.14.0 已废弃），本仓库生成的配置已删除该字段。

## 三个配置版本

仓库内提供三版，互相独立、可并存，按需选用：

| 文件 | 定位 | 规则集来源 |
| --- | --- | --- |
| `singbox-config.json` | 基础 / 推荐版 | MetaCubeX：`geosite-cn` / `geoip-cn` / `geosite-ads` |
| `singbox-config-cn.json` | 国内增强版 | 基础版 + **Repcz** 现成国内集（`ChinaDomain` / `ChinaIP` / `Ads_EasyListChina`） |
| `singbox-config-geo.json` | 地区分流版 | 增强版 + 按服务流媒体路由（见下） |

三版均包含全部 16 个节点（trojan / hysteria2 / shadowsocks）+ 国家分组（🇺🇸🇩🇪🇬🇧🇫🇷🇳🇱🇷🇺🇮🇳 的 selector / urltest）、tun 入站、DNS 与 4 条基础路由。

### 地区分流版路由逻辑

在「国内直连 / 广告拦截」之上，额外把流媒体按版权地区锁定节点，比一律走 `final`（🚀节点）更稳：

- Netflix / Disney+ / Prime Video / Hulu / HBO / Spotify → 🇺🇸 美国
- BBC → 🇬🇧 英国
- bilibili → direct（国内直连）
- openai / youtube / google 等 → 走 `final`（🚀节点）

## 使用方法

### 1. 选版本

- 只想国内直连 + 基础广告拦截 → `singbox-config.json`
- 想要更全的国内域名 / IP 白名单与国内广告拦截 → `singbox-config-cn.json`
- 想让流媒体按版权地区走对应国家节点（如 Netflix 走美国）→ `singbox-config-geo.json`

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

启动后查看日志：本仓库三版均为 **1.12+ 格式**，正常应**无 `legacy dns` 警告**；若出现，说明客户端内核过旧，请升级到支持 1.12+ 的 sing-box 版本。

## 注意事项

- 三版均为 **sing-box 1.12+ 格式，无 `legacy dns`**，适用于当前主流 sing-box / GUI 客户端。
- `route.rule_set` 中的 `.srs` 规则集通过 `download_detour: "direct"` 从 `raw.githubusercontent.com` 拉取 —— **客户端本机需能直连该域名**。若网络无法直连，可将该字段改为走代理的节点 tag，或预先下载 `.srs` 改为本地 `path` 引用。
- 原 `proxies.yaml` **未改动**，Clash / Mihomo 用户继续用原订阅即可。
- 原 Clash 约 10000 条 `rules` **未逐条转换**：按你的要求改用 GitHub 现成规则集（MetaCubeX / Repcz）替代，零手工转译、零维护成本。
- `route.rules` 里使用的 `outbound` 字段是 1.12+ 标准用法，与 `dns.rules` 里已废弃的 `outbound` 旧写法无关，不会触发 `legacy dns` 警告。

## 规则集来源

- **MetaCubeX/meta-rules-dat**：`geosite-cn` / `geoip-cn` / `geosite-ads`，及按服务命名的 `netflix` / `disney` / `primevideo` / `hulu` / `hbo` / `spotify` / `bbc` / `bilibili` 等 `.srs`。
- **Repcz/Tool**：`ChinaDomain`（国内域名白名单）、`ChinaIP`（国内 IP）、`Ads_EasyListChina`（国内广告）。

## 关于仓库地址

本仓库的 Git remote 设置：

- `origin` → `bzfq21/BestClash`（你自己的仓库）：sing-box 配置（`singbox-config-*.json`）、本文档等新增文件都在这里，文档里的配置链接也用它。
- `upstream` → `PuddinCat/BestClash`（原项目）：**仅用于从上游同步 `proxies.yaml` 等订阅更新**，不在此修改。

因此 README 的订阅地址沿用 `PuddinCat/BestClash`（跟随上游源），而本文档的 sing-box 配置链接使用你自己的 `bzfq21/BestClash`。
