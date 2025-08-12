// netlify/functions/keyproxy.js
exports.handler = async (event) => {
  const method = (event.httpMethod || 'POST').toUpperCase();
  if (method === 'OPTIONS') return resp(200, {});
  if (method !== 'POST')    return resp(405, { ok:false, error:'method_not_allowed' });

  try {
    const APPS_EXEC = process.env.APPS_EXEC;
    if (!APPS_EXEC) return resp(500, { ok:false, error:'missing_APPS_EXEC' });

    const h  = event.headers || {};
    const ct = (h['content-type'] || h['Content-Type'] || '').toLowerCase();
    const raw = event.body || '';

    let payload = {};
    if (ct.includes('application/x-www-form-urlencoded')) {
      payload = parseForm(raw);
    } else if (raw) {
      try { payload = JSON.parse(raw); } catch { payload = {}; }
    }

    // Fallback: pak ook querystring als body leeg of action ontbreekt
    if (!payload.action) {
      const q = event.queryStringParameters || {};
      if (q && (q.action || q.hwid || q.key)) payload = q;
    }

    console.log(`[keyproxy] m=${method} ct=${ct} len=${raw.length} action=${payload.action||'undefined'}`);

    // Stuur door naar Apps Script (altijd JSON)
    const r = await fetch(APPS_EXEC, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify(payload),
      redirect: 'follow' // ok; Apps Script 302 wordt gevolgd
    });

    const text = await r.text();
    console.log(`[keyproxy] RESP ${r.status} ${text.slice(0,200)}`);
    return resp(r.ok ? 200 : 500, text, true);
  } catch (e) {
    console.error('[keyproxy] error', e);
    return resp(500, { ok:false, error:String(e) });
  }
};

function parseForm(body){
  const out = {};
  for (const part of String(body).split('&')){
    if (!part) continue;
    const [k,v=''] = part.split('=');
    out[decodeURIComponent(k.replace(/\+/g,' '))] = decodeURIComponent(v.replace(/\+/g,' '));
  }
  return out;
}
function resp(status, body, passthrough=false){
  return {
    statusCode: status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    },
    body: passthrough ? body : JSON.stringify(body),
  };
}
