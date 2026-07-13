# BestClash — sing-box 配置聚合

将 [PuddinCat/BestClash](https://github.com/PuddinCat/BestClash) 的 Clash 订阅与免费节点池融合，自动构建 **sing-box 1.12+** 配置。

每 30 分钟自动更新：抓取上游 `proxies.yaml` + 免费节点池 → SubBridge 转换 → 优化注入 → 推送。

## 订阅地址

四版配置，按需选用其一：

| 版本 | 地址 | 说明 |
|------|------|------|
| 基础版 | `https://raw.githubusercontent.com/bzfq21/BestClash/refs/heads/main/singbox-config.json` | MetaCubeX 国内分流 + 广告拦截 |
| 国内增强版 | `https://raw.githubusercontent.com/bzfq21/BestClash/refs/heads/main/singbox-config-cn.json` | 基础版 + Repcz 国内规则集 |
| 地区分流版 | `https://raw.githubusercontent.com/bzfq21/BestClash/refs/heads/main/singbox-config-geo.json` | 增强版 + 流媒体按版权地区路由 |
| 职业版 | `https://raw.githubusercontent.com/bzfq21/BestClash/refs/heads/main/singbox-config-geo-pro.json` | 地区分流版 + FakeIP + Clash API |

详细的版本差异与使用方法见 [SINGBOX.md](SINGBOX.md)。

## 节点来源

| 源 | 协议 | 节点数 |
|----|------|--------|
| [PuddinCat/BestClash](https://github.com/PuddinCat/BestClash) | trojan / hysteria2 / shadowsocks | ~16 |
| [Ruk1ng001/freeSub](https://github.com/Ruk1ng001/freeSub) | vless / vmess / trojan / ss / socks / hysteria2 | ~109 |
| **合计** | | **~125** |

## 特性

- ✅ 全自动构建（SubBridge + 后处理脚本）
- ✅ 节点 TLS 优化（UTLS Chrome 指纹、hysteria2 tls.enabled）
- ✅ 国内直连 + 广告拦截（MetaCubeX / Repcz 规则集，CDN 加速拉取）
- ✅ 流媒体版权地区路由（Netflix / Disney / BBC / Bilibili 等）
- ✅ DNS 优选（prefer_ipv4 + 备选 DNS + NTP 时间同步）
- ✅ cache_file 持久化（节点选择、FakeIP 映射重启不丢）
- ✅ tcp_fast_open 加速 TCP 握手

## 用量（sing-box GUI 客户端）

将上述订阅地址填入 sing-box 客户端（NekoBox / sing-box for Android / SFI / Stash 等）即可。

## 鸣谢

- [PuddinCat/BestClash](https://github.com/PuddinCat/BestClash) — 上游 Clash 订阅源
- [Ruk1ng001/freeSub](https://github.com/Ruk1ng001/freeSub) — 免费节点池
- [zzf2333/SubBridge](https://github.com/zzf2333/SubBridge) — Clash → sing-box 转换工具
- [MetaCubeX/meta-rules-dat](https://github.com/MetaCubeX/meta-rules-dat) — 通用规则集
- [Repcz/Tool](https://github.com/Repcz/Tool) — 国内增强规则集
- [jsdelivr](https://www.jsdelivr.com/) — 规则集 CDN 加速
