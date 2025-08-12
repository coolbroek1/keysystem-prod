// netlify/functions/keyproxy.js — handles base64 bodies + JSON/form
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return resp(200, {});
  if (event.httpMethod !== 'POST')   return resp(405, { ok:false, error:'method_not_allowed' });

  try {
    const APPS_EXEC = process.env.APPS_EXEC;
    if (!APPS_EXEC) return resp(500, { ok:false, error:'missing_APPS_EXEC' });

    // Decode body if Netlify marked it as base64 (happens with some executors)
    const isB64 = !!event.isBase64Encoded;
    let raw = event.body || '';
    if (isB64) {
      raw = Buffer.from(raw, 'base64').toString('utf8');
    }

    const h  = event.headers || {};
    const ct = (h['content-type'] || h['Content-Type'] || '').toLowerCase();

    let payload = {};
    if (ct.includes('application/x-www-form-urlencoded')) {
      payload = parseForm(raw);
    } else {
      try {
        payload = JSON.parse(raw || '{}');
      } catch {
        // Some executors lie about content-type → fallback parse as form
        payload = parseForm(raw);
      }
    }

    // Forward to Apps Script as JSON
    const r = await fetch(APPS_EXEC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const text = await r.text();
    // passthrough: keep exact JSON body from Apps Script
    return resp(r.ok ? 200 : 500, text, true);
  } catch (e) {
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    },
    body: passthrough ? body : JSON.stringify(body),
  };
}
