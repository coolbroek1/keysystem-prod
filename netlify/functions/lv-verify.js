// netlify/functions/lv-verify.js
// Server-side Linkvertise anti-bypass verification.
// Set env var LV_TOKEN in Netlify → Site settings → Environment → Variables.

exports.handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return cors(200, '');
  }

  // Accept POST (JSON or form) and also GET with ?hash=...
  let hash = '';
  try {
    const h = (event.headers?.['content-type'] || event.headers?.['Content-Type'] || '').toLowerCase();
    if (event.httpMethod === 'GET') {
      const qs = new URLSearchParams(event.rawQuery || '');
      hash = String(qs.get('hash') || '');
    } else if (h.includes('application/json')) {
      const body = JSON.parse(event.body || '{}');
      hash = String(body.hash || '');
    } else {
      const body = parseForm(event.body || '');
      hash = String(body.hash || '');
    }
  } catch (_) { /* ignore */ }

  if (!hash || hash.length !== 64) {
    return cors(400, JSON.stringify({ ok:false, error:'bad_or_missing_hash' }));
  }

  const LV_TOKEN = process.env.LV_TOKEN;
  if (!LV_TOKEN) {
    return cors(500, JSON.stringify({ ok:false, error:'missing_LV_TOKEN' }));
  }

  try {
    const url = `https://publisher.linkvertise.com/api/v1/anti_bypassing?token=${encodeURIComponent(LV_TOKEN)}&hash=${encodeURIComponent(hash)}`;
    const r = await fetch(url, { method: 'POST' });
    const txtRaw = (await r.text() || '').trim();
    const txt = txtRaw.toUpperCase();

    // "TRUE"  -> valid, already consumed on LV side (one-time)
    // "FALSE" -> hash not found / already used
    // "Invalid token." -> wrong token
    if (txt === 'TRUE')   return cors(200, JSON.stringify({ ok:true,  valid:true }));
    if (txt === 'FALSE')  return cors(200, JSON.stringify({ ok:true,  valid:false, reason:'hash_not_found' }));
    if (txt.includes('INVALID')) return cors(200, JSON.stringify({ ok:false, error:'invalid_token' }));

    return cors(200, JSON.stringify({ ok:false, error:'unexpected_response', raw: txtRaw }));
  } catch (e) {
    return cors(500, JSON.stringify({ ok:false, error:String(e) }));
  }
};

function parseForm(body){
  const out = {};
  for (const part of (body || '').split('&')) {
    if (!part) continue;
    const [k, v=''] = part.split('=');
    const dk = decodeURIComponent(k.replace(/\+/g,' '));
    const dv = decodeURIComponent(v.replace(/\+/g,' '));
    out[dk] = dv;
  }
  return out;
}
function cors(status, body){
  return {
    statusCode: status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    },
    body: body,
  };
}
