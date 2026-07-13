# BestClash — sing-box 配置聚合

将 [PuddinCat/BestClash](https://github.com/PuddinCat/BestClash) 的 Clash 订阅与免费节点池融合，自动构建 **sing-box 1.12+** 配置。

每 30 分钟自动更新：抓取上游 `proxies.yaml` + 免费节点池 → SubBridge 转换 → 优化注入 → 推送。

## 订阅地址

四版配置，按需选用其一：

| 版本 | 说明 | 国内镜像（jsdelivr CDN） | 国际直连 |
|------|------|---------------------------|-----------|
| 基础版 | MetaCubeX 国内分流 + 广告拦截 | `https://testingcf.jsdelivr.net/gh/bzfq21/BestClash@main/singbox-config.json` | `https://raw.githubusercontent.com/bzfq21/BestClash/refs/heads/main/singbox-config.json` |
| 国内增强版 | 基础版 + Repcz 国内规则集 | `https://testingcf.jsdelivr.net/gh/bzfq21/BestClash@main/singbox-config-cn.json` | `https://raw.githubusercontent.com/bzfq21/BestClash/refs/heads/main/singbox-config-cn.json` |
| 地区分流版 | 增强版 + 流媒体版权地区路由 | `https://testingcf.jsdelivr.net/gh/bzfq21/BestClash@main/singbox-config-geo.json` | `https://raw.githubusercontent.com/bzfq21/BestClash/refs/heads/main/singbox-config-geo.json` |
| 职业版 | 地区分流版 + FakeIP + Clash API | `https://testingcf.jsdelivr.net/gh/bzfq21/BestClash@main/singbox-config-geo-pro.json` | `https://raw.githubusercontent.com/bzfq21/BestClash/refs/heads/main/singbox-config-geo-pro.json` |

### 版本差异

| 特性 | 基础版 | 国内增强版 | 地区分流版 | 职业版 |
|------|--------|------------|------------|--------|
| 国内直连（geosite-cn / geoip-cn） | ✅ | ✅ | ✅ | ✅ |
| 广告拦截（geosite-ads） | ✅ | ✅ | ✅ | ✅ |
| Repcz 国内增强规则集 | — | ✅ | ✅ | ✅ |
| Netflix / Disney / BBC 等媒体分流 | — | — | ✅ | ✅ |
| FakeIP（减少 DNS 泄漏） | — | — | — | ✅ |
| Clash API（:9090 仪表盘） | — | — | — | ✅ |
| strict_route（防路由环路） | — | — | — | ✅ |
| DNS block server（广告零响应） | — | — | — | ✅ |

### 使用方法

**命令行 sing-box（原生）**

```bash
# 例：用地区分流版
cp singbox-config-geo.json ~/.config/sing-box/config.json
sing-box run
```

**GUI 客户端（NekoBox / sing-box for Android / SFI / Stash 等）**

- **本地导入**：从仓库下载 `singbox-config-*.json` 后，在客户端选择「从文件加载」。
- **订阅链接**：将上面的订阅地址填入客户端订阅设置（任一版本）。

**验证**

启动后查看日志：四版均为 **1.12+ 格式**，正常应**无 `legacy dns` 警告**；若出现，说明内核过旧需升级。

### 注意事项

- 国内用户请使用「国内镜像（jsdelivr CDN）」列地址；`raw.githubusercontent.com` 在国内通常不可达。
- 免费节点来自公共订阅池，**稳定性不保证**，建议配合 `urltest` 自动测速使用。
- 若不需要免费池，可自行 `fork` 后删除 workflow 中的 `Fetch extra free node sources` 步骤。

### 自动构建

每 30 分钟通过 GitHub Actions 自动执行：

```
curl 上游 PuddinCat proxies.yaml  ─┐
                                   ├→ subbridge build → node enrich-singbox.js → JSON校验 → git push
curl 免费池(多源链) ──────────────┘
     ├ Ruk1ng001/freeSub (主)
     ├ ermaozi/get_subscribe (备)
     └ mfuu/v2ray (备)
```

构建失败时（如免费源宕机）自动降级为仅用上游源。

## 节点来源

| 源 | 协议 | 节点数 |
|----|------|--------|
| [PuddinCat/BestClash](https://github.com/PuddinCat/BestClash) | trojan / hysteria2 / shadowsocks | ~16 |
| [Ruk1ng001/freeSub](https://github.com/Ruk1ng001/freeSub) | vless / vmess / trojan / ss / socks / hysteria2 | ~109 |
| [ermaozi/get_subscribe](https://github.com/ermaozi/get_subscribe) | trojan / vmess / ss | ~20 |
| [mfuu/v2ray](https://github.com/mfuu/v2ray) | vmess / trojan / ss | ~27 |
| **合计** | | **~172**（含重叠） |

## 特性

- ✅ **全自动构建**（SubBridge + enrich-singbox.js 后处理）
- ✅ **多节点源融合**（上游 ~16 + 免费池多源链 ~156 = ~172 节点，自动 fallback）
- ✅ **节点 TLS 优化**（UTLS Chrome 指纹、hysteria2 tls.enabled、tcp_fast_open）
- ✅ **国内直连 + 广告拦截**（MetaCubeX / Repcz 规则集，CDN 加速拉取）
- ✅ **流媒体版权地区路由**（Netflix / Disney / BBC / Bilibili 等）
- ✅ **DNS 优选**（prefer_ipv4 + 备选 DNS + NTP 时间同步 + FakeIP[pro]）
- ✅ **cache_file 持久化**（节点选择 / FakeIP 映射重启不丢）
- ✅ **日志安静**（`warn` 级别，不刷屏）

## 鸣谢

- [PuddinCat/BestClash](https://github.com/PuddinCat/BestClash) — 上游 Clash 订阅源
- [Ruk1ng001/freeSub](https://github.com/Ruk1ng001/freeSub) — 免费节点池（主）
- [ermaozi/get_subscribe](https://github.com/ermaozi/get_subscribe) — 免费节点池（备）
- [mfuu/v2ray](https://github.com/mfuu/v2ray) — 免费节点池（备）
- [zzf2333/SubBridge](https://github.com/zzf2333/SubBridge) — Clash → sing-box 转换工具
- [MetaCubeX/meta-rules-dat](https://github.com/MetaCubeX/meta-rules-dat) — 通用规则集
- [Repcz/Tool](https://github.com/Repcz/Tool) — 国内增强规则集
- [jsdelivr](https://www.jsdelivr.com/) — 规则集 CDN 加速
