exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return resp(200, {});
  if (event.httpMethod !== 'POST')   return resp(405, { ok:false, error:'method_not_allowed' });

  try {
    const APPS_EXEC = process.env.APPS_EXEC;
    if (!APPS_EXEC) return resp(500, { ok:false, error:'missing_APPS_EXEC' });

    const h  = event.headers || {};
    const ct = (h['content-type'] || h['Content-Type'] || '').toLowerCase();
    const raw = event.body || '';
    let payload = {};

    if (ct.includes('application/json')) {
      try { payload = JSON.parse(raw || '{}'); }
      catch { payload = parseForm(raw); }              // fallback
    } else if (ct.includes('application/x-www-form-urlencoded')) {
      payload = parseForm(raw);
      // JSON die als form is binnengekomen? (één sleutel, lege value, sleutel begint met "{")
      const keys = Object.keys(payload);
      if (keys.length === 1 && payload[keys[0]] === '' && keys[0].trim().startsWith('{')){
        try { payload = JSON.parse(keys[0]); } catch {}
      }
    } else {
      // onbekend: probeer JSON, dan form
      try { payload = JSON.parse(raw || '{}'); }
      catch { payload = parseForm(raw); }
    }

    const r = await fetch(APPS_EXEC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const text = await r.text();
    return resp(r.ok ? 200 : 500, text, true);
  } catch (e) {
    return resp(500, { ok:false, error:String(e) });
  }
};

function parseForm(body){
  const out = {};
  (body || '').split('&').forEach(part => {
    if (!part) return;
    const idx = part.indexOf('=');
    if (idx === -1) { out[decodeURIComponent(part.replace(/\+/g,' '))] = ""; return; }
    const k = part.slice(0, idx), v = part.slice(idx+1);
    out[decodeURIComponent(k.replace(/\+/g,' '))] = decodeURIComponent((v||'').replace(/\+/g,' '));
  });
  return out;
}

function resp(status, body, passthrough=false){
  return {
    statusCode: status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    },
    body: passthrough ? body : JSON.stringify(body),
  };
}
