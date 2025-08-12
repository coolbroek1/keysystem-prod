// keyproxy.js — base64-safe + JSON/form fallback + logging
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return resp(200, {});
  if (event.httpMethod !== 'POST')   return resp(405, { ok:false, error:'method_not_allowed' });

  try {
    const APPS_EXEC = process.env.APPS_EXEC;
    if (!APPS_EXEC) return resp(500, { ok:false, error:'missing_APPS_EXEC' });

    const headers = event.headers || {};
    const ct = (headers['content-type'] || headers['Content-Type'] || '').toLowerCase();

    // --- body decode (base64-aware) ---
    const isB64 = !!event.isBase64Encoded;
    let raw = event.body || '';
    if (isB64) {
      try { raw = Buffer.from(raw, 'base64').toString('utf8'); }
      catch { /* ignore; keep raw */ }
    }

    // --- parse payload ---
    let payload = {};
    if (ct.includes('application/x-www-form-urlencoded')) {
      payload = parseForm(raw);
    } else {
      try { payload = JSON.parse(raw || '{}'); }
      catch { payload = parseForm(raw); } // sommige executors liegen over Content-Type
    }

    // Debug in Netlify logs
    console.log(`[keyproxy] ct=${ct} isB64=${isB64} len=${(raw||'').length} action=${payload.action || ''}`);

    // --- forward naar Apps Script (als JSON) ---
    const r = await fetch(APPS_EXEC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const text = await r.text(); // Apps Script geeft al JSON
    return resp(r.ok ? 200 : 500, text, true);
  } catch (e) {
    console.error('[keyproxy] error:', e);
    return resp(500, { ok:false, error:String(e) });
  }
};

function parseForm(body){
  const out = {};
  String(body || '').split('&').forEach(part => {
    if (!part) return;
    const [k, v=''] = part.split('=');
    out[decodeURIComponent(k.replace(/\+/g,' '))] = decodeURIComponent(v.replace(/\+/g,' '));
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
