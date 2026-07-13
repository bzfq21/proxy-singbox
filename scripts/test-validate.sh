#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(dirname "$SCRIPT_DIR")"
cd "$ROOT"

PASS=0
FAIL=0
GENERATED=0

ok()   { PASS=$((PASS + 1)); echo "  ✅ $1"; }
fail() { FAIL=$((FAIL + 1)); echo "  ❌ $1"; }

# ---- 1. Regenerate configs ----
echo "--- 1. Regenerate ---"
node scripts/enrich-singbox.js && GENERATED=1 && ok "enrich-singbox.js exited 0" || fail "enrich-singbox.js failed"

# ---- 2. JSON syntax ----
echo "--- 2. JSON syntax ---"
CONFIGS=(singbox-config.json singbox-config-cn.json singbox-config-geo.json singbox-config-geo-pro.json singbox-config-lite.json)
for f in "${CONFIGS[@]}"; do
  if [ -f "$f" ]; then
    node -e "JSON.parse(require('fs').readFileSync('$f','utf8'))" && ok "$f: valid JSON" || fail "$f: invalid JSON"
  else
    fail "$f: missing"
  fi
done

# ---- 3. Required fields per config ----
echo "--- 3. Required fields ---"
for f in "${CONFIGS[@]}"; do
  node -e "
    const c = JSON.parse(require('fs').readFileSync('$f','utf8'));
    const checks = [
      ['route.rules',           !!c.route?.rules],
      ['route.rule_set',        !!c.route?.rule_set],
      ['dns.servers',           !!c.dns?.servers],
      ['dns.rules',             !!c.dns?.rules],
      ['outbounds',             !!c.outbounds],
      ['inbounds[0].type',      c.inbounds?.[0]?.type === 'tun'],
      ['ntp.enabled',           c.ntp?.enabled === true],
      ['log.level',             c.log?.level === 'warn'],
    ];
    const failed = checks.filter(([k,v]) => !v).map(([k]) => k);
    if (failed.length) {
      console.log('missing:', failed.join(', '));
      process.exit(1);
    }
  " && ok "$f: all required fields present" || fail "$f: missing fields: $(node -e "try {
    const c = JSON.parse(require('fs').readFileSync('$f','utf8'));
    const checks = [['route.rules',!!c.route?.rules],['route.rule_set',!!c.route?.rule_set],['dns.servers',!!c.dns?.servers],['dns.rules',!!c.dns?.rules],['outbounds',!!c.outbounds],['inbounds[0].type',c.inbounds?.[0]?.type==='tun'],['ntp.enabled',c.ntp?.enabled===true],['log.level',c.log?.level==='warn']];const failed=checks.filter(([k,v])=>!v).map(([k])=>k);console.log(failed.join(', '))
  } catch(e) { console.log('parse error') }")"
done

# ---- 4. Pro-specific checks ----
echo "--- 4. Pro checks ---"
PRO="singbox-config-geo-pro.json"
if [ -f "$PRO" ]; then
  node -e "
    const c = JSON.parse(require('fs').readFileSync('$PRO','utf8'));
    const checks = [
      ['dns.final === fakeip',          c.dns?.final === 'fakeip'],
      ['dns.independent_cache === true', c.dns?.independent_cache === true],
      ['fakeip server has inet4_range',  c.dns?.servers?.some(s => s.type==='fakeip' && s.inet4_range==='198.18.0.0/15')],
      ['fakeip server has inet6_range',  c.dns?.servers?.some(s => s.type==='fakeip' && s.inet6_range==='fc00::/18')],
      ['no top-level dns.fakeip',        c.dns?.fakeip === undefined],
      ['no cache_file (compat)',          c.cache_file === undefined],
      ['clash_api enabled',              !!c.experimental?.clash_api],
    ];
    const failed = checks.filter(([k,v]) => !v).map(([k]) => k);
    if (failed.length) { console.log('FAIL:', failed.join(', ')); process.exit(1); }
    console.log('ALL OK');
  " && ok "$PRO: all checks pass" || fail "$PRO: $(node -e "try {
    const c=JSON.parse(require('fs').readFileSync('$PRO','utf8'));
    const checks=[['dns.final===fakeip',c.dns?.final==='fakeip'],['dns.independent_cache===true',c.dns?.independent_cache===true],['fakeip has inet4_range',c.dns?.servers?.some(s=>s.type==='fakeip'&&s.inet4_range==='198.18.0.0/15')],['fakeip has inet6_range',c.dns?.servers?.some(s=>s.type==='fakeip'&&s.inet6_range==='fc00::/18')],['no top-level dns.fakeip',c.dns?.fakeip===undefined],['no cache_file',c.cache_file===undefined],['clash_api enabled',!!c.experimental?.clash_api]];
    const failed=checks.filter(([k,v])=>!v).map(([k])=>k);
    console.log(failed.join(', '))
  } catch(e) {console.log('parse error')}")"
fi

# ---- 5. Lite-specific checks ----
echo "--- 5. Lite checks ---"
LITE="singbox-config-lite.json"
if [ -f "$LITE" ]; then
  node -e "
    const c = JSON.parse(require('fs').readFileSync('$LITE','utf8'));
    const tags = new Set(c.outbounds.map(o => o.tag));
    const freePool = c.outbounds.filter(o => o.tag && o.tag.includes('github.com')).length;
    const dangling = c.outbounds.reduce((acc, ob) => {
      if (Array.isArray(ob.outbounds)) {
        for (const t of ob.outbounds) if (!tags.has(t)) acc.push(ob.tag + '->' + t);
      }
      return acc;
    }, []).length;
    const checks = [
      ['no free-pool nodes',         freePool === 0],
      ['no dangling group refs',     dangling === 0],
      ['dns has no tls server',      (c.dns?.servers || []).every(s => s.type !== 'tls')],
      ['dns.final === local',        c.dns?.final === 'local'],
      ['rule_set minimal (<=3)',     (c.route?.rule_set || []).length <= 3],
    ];
    const failed = checks.filter(([k,v]) => !v).map(([k]) => k);
    if (failed.length) { console.log('FAIL:', failed.join(', ')); process.exit(1); }
    console.log('ALL OK');
  " && ok "$LITE: lite checks pass" || fail "$LITE: lite checks failed"
fi

# ---- 6. Common invariants ----
echo "--- 6. Invariants ---"
for f in "${CONFIGS[@]}"; do
  if [ ! -f "$f" ]; then continue; fi
  node -e "
    const c = JSON.parse(require('fs').readFileSync('$f','utf8'));
    const tun = c.inbounds?.find(i => i.type === 'tun');
    const checks = [
      ['TUN strict_route',            tun?.strict_route === true],
      ['TUN stack system',            tun?.stack === 'system'],
      ['ip_is_private route rule',    c.route?.rules?.some(r => r.ip_is_private === true)],
      ['hijack-dns route rule',       c.route?.rules?.some(r => r.action === 'hijack-dns')],
      ['no block action (1.13)',      c.route?.rules?.every(r => r.action !== 'block')],
      ['sniff route action',          c.route?.rules?.some(r => r.action === 'sniff')],
    ];
    const failed = checks.filter(([k,v]) => !v).map(([k]) => k);
    if (failed.length) { console.log('FAIL:', failed.join(', ')); process.exit(1); }
  " && ok "$f: invariants OK" || fail "$f: failed invariants"
done

# ---- Summary ----
echo ""
echo "--- Results: $PASS pass, $FAIL fail ---"
if [ "$FAIL" -gt 0 ]; then exit 1; fi
