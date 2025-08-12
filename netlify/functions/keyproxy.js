// netlify/functions/keyproxy.js — robust: JSON + FORM + GET fallback
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return resp(200, {});
  const APPS_EXEC = process.env.APPS_EXEC;
  if (!APPS_EXEC) return resp(500, { ok:false, error:'missing_APPS_EXEC' });

  const h = event.headers || {};
  const ct = (h['content-type'] || h['Content-Type'] || '').toLowerCase();

  let payload = {};
  let src = 'none';

  try {
    if (event.httpMethod === 'GET') {
      payload = event.queryStringParameters || {};
      src = 'qs';
    } else if (ct.includes('application/json')) {
      payload = JSON.parse(event.body || '{}');
      src = 'json';
    } else if (ct.includes('application/x-www-form-urlencoded')) {
      payload = parseForm(event.body || '');
      src = (event.body && event.body.length > 0) ? 'form' : 'form-empty';
    } else {
      // probeer JSON alsnog
      payload = JSON.parse(event.body || '{}');
      src = 'unknown';
    }
  } catch (_) {
    payload = {};
    src = 'parse-error';
  }

  const len = (event.body || '').length;
  const action = payload.action || 'undefined';
  console.log(`[keyproxy] m=${event.httpMethod} ct=${ct} len=${len} src=${src} action=${action}`);

  // Extra fallback: sommige clients zetten body leeg maar parameters in de URL
  if ((!payload || Object.keys(payload).length === 0 || action === 'undefined')
      && event.queryStringParameters && Object.keys(event.queryStringParameters).length) {
    payload = event.queryStringParameters;
  }

  if (!payload.action) {
    return resp(200, { ok:false, error:'unknown_action' });
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

function resp(status, body, passthrough=false){
  return {
    statusCode: status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    },
    body: passthrough ? body : JSON.stringify(body),
  };
}
