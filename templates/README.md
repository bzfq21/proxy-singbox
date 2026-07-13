# sing-box 配置模板参考

## 来源说明

sing-box 官方文档（https://sing-box.sagernet.org/configuration）**没有提供单一"推荐配置模板"**，而是按模块（log, dns, ntp, inbounds, outbounds, route 等）分别文档化。这里的模板来自两个方向：

1. **Official** — 从官方文档示例摘取，代表官方推荐的用法
2. **Community** — 社区广泛使用的现成模板，可搭配订阅转换工具使用

## 文件清单

| 文件 | 来源 | 说明 |
|------|------|------|
| `official/minimal-tun-client.json` | [官方客户端文档](https://sing-box.sagernet.org/manual/proxy/client/) | 官方推荐最低配置 TUN 客户端（IPv4） |
| `official/minimal-tun-client-fakeip.json` | 同上 | 同上 + FakeIP DNS |
| `community/senzyo-tun.json` | [senzyo/sing-box-templates](https://github.com/senzyo/sing-box-templates) (96 ⭐) | 社区流行 TUN 模板，带 Clash API + 规则集 + 地区分流 |
| `community/senzyo-tun-fakeip.json` | 同上 | senzyo 模板的 FakeIP 变体 |
| `community/senzyo-tun-apple.json` | 同上 | senzyo 模板的 Apple 设备变体 |

## 关键发现

### 1. sniff 的正确用法（1.12+）

**❌ 错误（已废弃）：**
```json
{
  "route": {
    "sniff_override_destination": true  // 1.12 起已移除
  }
}
```

**✅ 正确（推荐）：**
```json
{
  "route": {
    "rules": [
      { "action": "sniff" }           // 作为 route rule 执行
    ]
  }
}
```

或对特定入站启用：
```json
{
  "route": {
    "rules": [
      { "inbound": "tun-in", "action": "sniff" },
      { "protocol": "dns", "action": "hijack-dns" }
    ]
  }
}
```

### 2. urltest 配置变更（1.13+）

**❌ 错误（1.13+ 已移除）：**
```json
{
  "type": "urltest",
  "connect_timeout": "10s"   // 1.13 起已移除
}
```

urltest 不再支持 `connect_timeout`，使用默认超时即可。

### 3. 官方推荐结构

```json
{
  "log": {},
  "dns": {},
  "ntp": {},
  "certificate": {},
  "certificate_providers": [],
  "http_clients": [],
  "network_namespaces": [],
  "endpoints": [],
  "inbounds": [],
  "outbounds": [],
  "route": {},
  "services": [],
  "experimental": {}
}
```

更多细节见：https://sing-box.sagernet.org/configuration
