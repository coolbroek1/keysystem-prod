// keyproxy.js — forwards POST (JSON or form) and GET (query) to Apps Script
exports.handler = async (event) => {
  try {
    const APPS_EXEC = process.env.APPS_EXEC;
    if (!APPS_EXEC) return resp(500, { ok:false, error:'missing_APPS_EXEC' });

    // CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return resp(200, {});
    }

    // GET → parse query and forward as GET (Roblox GET-only validate)
    if (event.httpMethod === 'GET') {
      const qs = event.queryStringParameters || {};
      // Small log to help you debug
      console.log(`[keyproxy] GET`, qs);
      const url = APPS_EXEC + '?' + toQS(qs);
      const r = await fetch(url, { method: 'GET' });
      const text = await r.text();
      return resp(r.ok ? 200 : 500, text, true);
    }

    // Only POST supported otherwise
    if (event.httpMethod !== 'POST') {
      return resp(405, { ok:false, error:'method_not_allowed' });
    }

    const ct = (event.headers['content-type'] || event.headers['Content-Type'] || '').toLowerCase();
    let payload = {};
    if (ct.includes('application/x-www-form-urlencoded')) {
      payload = parseForm(event.body || '');
    } else {
      payload = JSON.parse(event.body || '{}');
    }

    console.log(`[keyproxy] POST action=${payload && payload.action}`);

    const r = await fetch(APPS_EXEC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const text = await r.text();
    return resp(r.ok ? 200 : 500, text, true);
  } catch (e) {
    console.error('keyproxy error', e);
    return resp(500, { ok:false, error:String(e) });
  }
};

function toQS(obj){
  const parts = [];
  for (const k in obj) {
    const v = obj[k] == null ? '' : String(obj[k]);
    parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(v));
  }
  return parts.join('&');
}

function parseForm(body){
  const out = {};
  for (const part of body.split('&')){
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
