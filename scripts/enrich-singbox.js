const fs = require('fs');
const path = require('path');

const INPUT = process.argv[2] || 'singbox-config.json';
const OUT_DIR = process.argv[3] || '.';

const config = JSON.parse(fs.readFileSync(INPUT, 'utf8'));

// Clean up deprecated fields
if (config.dns?.independent_cache !== undefined) {
  delete config.dns.independent_cache;
}

// Fix hysteria2 outbounds: tls.enabled required in sing-box 1.12+
for (const ob of config.outbounds) {
  if (ob.type === 'hysteria2' && !ob.tls) {
    ob.tls = { enabled: true };
  }
}

for (const ob of config.outbounds) {
  if (ob.type === 'trojan') {
    ob.tls = { enabled: true, utls: { enabled: true, fingerprint: 'chrome' } };
  }
}

function ruleSetUrlCDN(url) {
  // Handle: https://github.com/OWNER/REPO/raw/BRANCH/PATH
  url = url.replace(
    /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)\/raw\/([^\/]+)\/(.+)$/,
    'https://testingcf.jsdelivr.net/gh/$1/$2@$3/$4'
  );
  // Handle: https://raw.githubusercontent.com/OWNER/REPO/BRANCH/PATH
  url = url.replace(
    /^https?:\/\/raw\.githubusercontent\.com\/([^\/]+)\/([^\/]+)\/([^\/]+)\/(.+)$/,
    'https://testingcf.jsdelivr.net/gh/$1/$2@$3/$4'
  );
  return url;
}
for (const rs of config.route.rule_set) {
  rs.url = ruleSetUrlCDN(rs.url);
}

// ---- Helpers ----

function ruleSetEntry(tag, url) {
  return {
    type: 'remote',
    tag,
    format: 'binary',
    url,
    download_detour: 'direct',
    update_interval: '3d',
  };
}

function addRuleSetIfMissing(cfg, entries) {
  const tags = new Set(cfg.route.rule_set.map(r => r.tag));
  for (const e of entries) {
    if (!tags.has(e.tag)) {
      cfg.route.rule_set.push(e);
      tags.add(e.tag);
    }
  }
}

function findRuleIndex(cfg, matchTags) {
  return cfg.route.rules.findIndex(
    r => r.rule_set && matchTags.every(t => r.rule_set.includes(t))
  );
}

// ---- Repcz China rule sets ----

const REPCZ_RULES = [
  ruleSetEntry('repcz-cn-domain', 'https://testingcf.jsdelivr.net/gh/Repcz/Tool@X/sing-box/Rules/ChinaDomain.srs'),
  ruleSetEntry('repcz-cn-ip', 'https://testingcf.jsdelivr.net/gh/Repcz/Tool@X/sing-box/Rules/ChinaIP.srs'),
  ruleSetEntry('repcz-ads-cn', 'https://testingcf.jsdelivr.net/gh/Repcz/Tool@X/sing-box/Rules/Ads_EasyListChina.srs'),
];

const MEDIA_RULES = [
  ruleSetEntry('netflix', 'https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@sing/geo/geosite/netflix.srs'),
  ruleSetEntry('disney', 'https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@sing/geo/geosite/disney.srs'),
  ruleSetEntry('primevideo', 'https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@sing/geo/geosite/primevideo.srs'),
  ruleSetEntry('hulu', 'https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@sing/geo/geosite/hulu.srs'),
  ruleSetEntry('hbo', 'https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@sing/geo/geosite/hbo.srs'),
  ruleSetEntry('spotify', 'https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@sing/geo/geosite/spotify.srs'),
  ruleSetEntry('bbc', 'https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@sing/geo/geosite/bbc.srs'),
  ruleSetEntry('bilibili', 'https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@sing/geo/geosite/bilibili.srs'),
];

const MEDIA_ROUTE_RULES = [
  { rule_set: ['netflix'], outbound: '🇺🇸 美国' },
  { rule_set: ['disney'], outbound: '🇺🇸 美国' },
  { rule_set: ['primevideo'], outbound: '🇺🇸 美国' },
  { rule_set: ['hulu'], outbound: '🇺🇸 美国' },
  { rule_set: ['hbo'], outbound: '🇺🇸 美国' },
  { rule_set: ['spotify'], outbound: '🇺🇸 美国' },
  { rule_set: ['bbc'], outbound: '🇬🇧 英国' },
  { rule_set: ['bilibili'], outbound: 'direct' },
];

function applyBaseOptimizations(cfg) {
  if (!cfg.cache_file) {
    cfg.cache_file = { enabled: true, path: 'cache.db', cache_id: 'singbox' };
  }
  const tunIn = cfg.inbounds?.find(i => i.type === 'tun');
  if (tunIn && !tunIn.stack) {
    tunIn.stack = 'system';
  }
  if (cfg.dns?.servers && !cfg.dns.servers.some(s => s.tag === 'local-alt')) {
    cfg.dns.servers.push({ tag: 'local-alt', type: 'udp', server: '114.114.114.114' });
  }
  if (cfg.dns && !cfg.dns.strategy) {
    cfg.dns.strategy = 'prefer_ipv4';
  }
  if (!cfg.ntp) {
    cfg.ntp = { enabled: true, server: 'time.cloudflare.com' };
  }
  if (cfg.route && cfg.route.sniff_override_destination === undefined) {
    cfg.route.sniff_override_destination = true;
  }
  if (!cfg.platform) {
    cfg.platform = { http_proxy: { enabled: false } };
  }
  for (const ob of cfg.outbounds) {
    if (['trojan', 'shadowsocks'].includes(ob.type) && ob.tcp_fast_open === undefined) {
      ob.tcp_fast_open = true;
    }
  }
  // urltest does not support connect_timeout (sing-box rejects unknown fields)
  cfg.log = { level: 'warn' };
}
applyBaseOptimizations(config);

// ---- Write base (cleaned) ----
fs.writeFileSync(path.join(OUT_DIR, 'singbox-config.json'), JSON.stringify(config, null, 2));
console.log('✅ base: singbox-config.json');

// ---- Build cn version ----

const cn = JSON.parse(JSON.stringify(config));
addRuleSetIfMissing(cn, REPCZ_RULES);

const adsIdx = findRuleIndex(cn, ['geosite-ads']);
if (adsIdx >= 0) {
  cn.route.rules[adsIdx] = {
    rule_set: ['geosite-ads', 'repcz-ads-cn'],
    outbound: 'block',
  };
}

const cnIdx = findRuleIndex(cn, ['geosite-cn', 'geoip-cn']);
if (cnIdx >= 0) {
  cn.route.rules[cnIdx] = {
    rule_set: ['geosite-cn', 'geoip-cn', 'repcz-cn-domain', 'repcz-cn-ip'],
    outbound: 'direct',
  };
}

fs.writeFileSync(path.join(OUT_DIR, 'singbox-config-cn.json'), JSON.stringify(cn, null, 2));
console.log('✅ cn: singbox-config-cn.json');

// ---- Build geo version ----

const geo = JSON.parse(JSON.stringify(cn));
addRuleSetIfMissing(geo, MEDIA_RULES);

const geoAdsIdx = findRuleIndex(geo, ['geosite-ads']);
const geoCnIdx = findRuleIndex(geo, ['geosite-cn', 'geoip-cn']);

if (geoAdsIdx >= 0 && geoCnIdx > geoAdsIdx) {
  // Insert media rules after ads block, before cn-direct
  geo.route.rules.splice(geoCnIdx, 0, ...MEDIA_ROUTE_RULES);
} else {
  console.error('⚠️ Could not locate rule positions for media injection; inserting before cn-direct.');
  geo.route.rules.splice(-1, 0, ...MEDIA_ROUTE_RULES);
}

fs.writeFileSync(path.join(OUT_DIR, 'singbox-config-geo.json'), JSON.stringify(geo, null, 2));
console.log('✅ geo: singbox-config-geo.json');

// ---- Build pro version ----

const pro = JSON.parse(JSON.stringify(geo));

pro.dns.fakeip = { enabled: true, inet4_range: '198.18.0.0/15', inet6_range: 'fc00::/18' };
pro.dns.servers = [
  { tag: 'local', type: 'udp', server: '223.5.5.5' },
  { tag: 'local-alt', type: 'udp', server: '114.114.114.114' },
  { tag: 'block-dns', type: 'block', server: 'rcode://success' },
  { tag: 'fakeip', type: 'fakeip', resolver: 'local' },
];
pro.dns.rules = [
  { rule_set: ['geosite-ads', 'repcz-ads-cn'], server: 'block-dns' },
  { rule_set: ['geosite-cn', 'repcz-cn-domain'], server: 'local' },
];
pro.dns.final = 'fakeip';

pro.route.strict_route = true;

pro.experimental = {
  clash_api: {
    external_controller: '127.0.0.1:9090',
    external_ui: '',
    secret: '',
  },
};

fs.writeFileSync(path.join(OUT_DIR, 'singbox-config-geo-pro.json'), JSON.stringify(pro, null, 2));
console.log('✅ pro: singbox-config-geo-pro.json');
