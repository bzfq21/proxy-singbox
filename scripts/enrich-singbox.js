const fs = require('fs');
const path = require('path');

const INPUT = process.argv[2] || 'singbox-config.json';
const OUT_DIR = process.argv[3] || '.';

const config = JSON.parse(fs.readFileSync(INPUT, 'utf8'));

// Clean up deprecated fields
if (config.independent_cache !== undefined) {
  delete config.independent_cache;
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
  ruleSetEntry('repcz-cn-domain', 'https://raw.githubusercontent.com/Repcz/Tool/X/sing-box/Rules/ChinaDomain.srs'),
  ruleSetEntry('repcz-cn-ip', 'https://raw.githubusercontent.com/Repcz/Tool/X/sing-box/Rules/ChinaIP.srs'),
  ruleSetEntry('repcz-ads-cn', 'https://raw.githubusercontent.com/Repcz/Tool/X/sing-box/Rules/Ads_EasyListChina.srs'),
];

const MEDIA_RULES = [
  ruleSetEntry('netflix', 'https://github.com/MetaCubeX/meta-rules-dat/raw/sing/geo/geosite/netflix.srs'),
  ruleSetEntry('disney', 'https://github.com/MetaCubeX/meta-rules-dat/raw/sing/geo/geosite/disney.srs'),
  ruleSetEntry('primevideo', 'https://github.com/MetaCubeX/meta-rules-dat/raw/sing/geo/geosite/primevideo.srs'),
  ruleSetEntry('hulu', 'https://github.com/MetaCubeX/meta-rules-dat/raw/sing/geo/geosite/hulu.srs'),
  ruleSetEntry('hbo', 'https://github.com/MetaCubeX/meta-rules-dat/raw/sing/geo/geosite/hbo.srs'),
  ruleSetEntry('spotify', 'https://github.com/MetaCubeX/meta-rules-dat/raw/sing/geo/geosite/spotify.srs'),
  ruleSetEntry('bbc', 'https://github.com/MetaCubeX/meta-rules-dat/raw/sing/geo/geosite/bbc.srs'),
  ruleSetEntry('bilibili', 'https://github.com/MetaCubeX/meta-rules-dat/raw/sing/geo/geosite/bilibili.srs'),
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
  console.error('⚠️ Could not locate rule positions for media injection; appending instead.');
  geo.route.rules.splice(-1, 0, ...MEDIA_ROUTE_RULES);
}

fs.writeFileSync(path.join(OUT_DIR, 'singbox-config-geo.json'), JSON.stringify(geo, null, 2));
console.log('✅ geo: singbox-config-geo.json');
