// Verifies LV step: ok if (hash looks real) OR (referer is a Linkvertise domain).
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return cors(200, {});
  if (event.httpMethod !== 'POST')   return cors(405, { ok:false, error:'method_not_allowed' });

  try {
    const h  = event.headers || {};
    const ct = (h['content-type'] || h['Content-Type'] || '').toLowerCase();
    const body = ct.includes('application/x-www-form-urlencoded')
      ? parseForm(event.body || '')
      : JSON.parse(event.body || '{}');

    const step = String(body.step || '');
    const hash = String(body.hash || '');
    const hwid = body.hwid ? String(body.hwid) : null;

    const refFromHdr = h['referer'] || h['referrer'] || '';
    const ref = String(body.ref || refFromHdr);

    if (step !== '1' && step !== '2') return cors(400, { ok:false, error:'bad_step' });

    const allowed = [
      'linkvertise.com', 'linkvertise.download',
      'link-hub.net', 'link-target.net', 'link-to.net', 'linkvertise.net'
    ];
    const refURL  = safeURL(ref);
    const isFromLV = !!(refURL && allowed.some(d => refURL.hostname.endsWith(d)));

    const hasHash = (hash && hash.length >= 32);

    // Accept if looks legit
    if (hasHash || isFromLV) {
      return cors(200, { ok:true });
    }

    // Bypass or direct open
    return cors(200, { ok:false, reason:'bypass' });
  } catch (e) {
    return cors(500, { ok:false, error:String(e) });
  }
};

function safeURL(u){ try { return new URL(u); } catch(_) { return null; } }
function parseForm(body){
  const out = {};
  for (const part of (body || '').split('&')) {
    if (!part) continue;
    const [k,v=''] = part.split('=');
    out[decodeURIComponent(k.replace(/\+/g,' '))] = decodeURIComponent(v.replace(/\+/g,' '));
  }
  return out;
}
function cors(status, body){
  return {
    statusCode: status,
    headers: {
      'Content-Type':'application/json',
      'Access-Control-Allow-Origin':'*',
      'Access-Control-Allow-Headers':'Content-Type',
      'Access-Control-Allow-Methods':'POST, OPTIONS',
    },
    body: JSON.stringify(body),
  };
}
