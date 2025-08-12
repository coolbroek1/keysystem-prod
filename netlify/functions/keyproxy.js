// netlify/functions/keyproxy.js — hardened: JSON + FORM + GET + empty-body ignore
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return resp(200, {});
  const APPS_EXEC = process.env.APPS_EXEC;
  if (!APPS_EXEC) return resp(500, { ok:false, error:'missing_APPS_EXEC' });

  const h  = event.headers || {};
  const ct = (h['content-type'] || h['Content-Type'] || '').toLowerCase();
  const qs = event.queryStringParameters || {};
  const bodyStr = event.body || '';

  let payload = {};
  let src = 'none';

  try {
    if (event.httpMethod === 'GET') {
      payload = qs; src = 'qs';
    } else if (ct.includes('application/json')) {
      payload = JSON.parse(bodyStr || '{}'); src = 'json';
    } else if (ct.includes('application/x-www-form-urlencoded')) {
      payload = parseForm(bodyStr || ''); src = (bodyStr && bodyStr.length > 0) ? 'form' : 'form-empty';
    } else {
      // probeer eerst JSON, anders FORM
      try { payload = JSON.parse(bodyStr || '{}'); src = 'unknown-json'; }
      catch { payload = parseForm(bodyStr || ''); src = 'unknown-form'; }
    }
  } catch {
    payload = {}; src = 'parse-error';
  }

  const len    = bodyStr.length;
  const action = payload.action || 'undefined';
  const ua     = h['user-agent'] || '';
  const ip     = h['x-nf-client-connection-ip'] || h['client-ip'] || '';
  console.log(`[keyproxy] m=${event.httpMethod} ct=${ct} len=${len} src=${src} action=${action} ip=${ip} ua=${ua.slice(0,60)}`);

  // Fallback: als body leeg is maar er staat wel iets in de URL, gebruik dat
  if ((!payload || Object.keys(payload).length === 0 || action === 'undefined')
      && qs && Object.keys(qs).length) {
    payload = qs;
  }

  // Nog steeds niets bruikbaars? Gewoon negeren (geen error-spam meer).
  if (!payload || !payload.action) {
    return {
      statusCode: 204,
      headers: cors(),
      body: '' // 204 heeft geen body
    };
  }

  try {
    const r = await fetch(APPS_EXEC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const text = await r.text();
    console.log(`[keyproxy] RESP ${r.status} ${text.slice(0,160)}`);
    return resp(r.ok ? 200 : 500, text, true);
  } catch (e) {
    return resp(500, { ok:false, error:String(e) });
  }
};

function parseForm(body){
  const out = {};
  for (const part of (body || '').split('&')){
    if (!part) continue;
    const [k,v=''] = part.split('=');
    out[decodeURIComponent(k.replace(/\+/g,' '))] = decodeURIComponent(v.replace(/\+/g,' '));
  }
  return out;
}

function cors(){
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  };
}

function resp(status, body, passthrough=false){
  return { statusCode: status, headers: cors(), body: passthrough ? body : JSON.stringify(body) };
}
