// Verifieert Linkvertise anti-bypass hash met officiële API (binnen 10s window).
// Env vars (Netlify -> Site settings -> Environment):
//   LINKVERTISE_TOKEN = jouw 64-char token uit de “Anti Bypass Documentation”
//
// Aanroep (POST, JSON body): { step: 1|2, hash: "<64 hex>" }
// Antwoord: { ok:true, verified:true } of { ok:false, error:"..." }

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return res(200, {});
  if (event.httpMethod !== 'POST')   return res(405, { ok:false, error:'method_not_allowed' });

  try {
    const token = process.env.LINKVERTISE_TOKEN;
    if (!token || token.length !== 64) {
      return res(500, { ok:false, error:'missing_LINKVERTISE_TOKEN' });
    }

    // JSON of form fallback
    const h = event.headers || {};
    const ct = (h['content-type'] || h['Content-Type'] || '').toLowerCase();
    let body = {};
    if (ct.includes('application/x-www-form-urlencoded')) {
      body = parseForm(event.body || '');
    } else {
      body = JSON.parse(event.body || '{}');
    }

    const step = String(body.step || '').trim();
    const hash = String(body.hash || '').trim();

    if (step !== '1' && step !== '2')   return res(400, { ok:false, error:'bad_step' });
    if (!/^[a-f0-9]{64}$/i.test(hash))  return res(400, { ok:false, error:'bad_hash' });

    // Officiële Linkvertise anti-bypass call (hash geldig ~10s)
    const url = `https://publisher.linkvertise.com/api/v1/anti_bypassing?token=${token}&hash=${hash}`;
    const r   = await fetch(url, { method:'POST' });
    const txt = (await r.text() || '').toUpperCase();

    if (txt.includes('TRUE')) {
      return res(200, { ok:true, verified:true });
    }
    // FALSE of andere tekst => ongeldig / te laat / al gebruikt
    return res(200, { ok:false, error:'not_verified' });
  } catch (e) {
    return res(500, { ok:false, error:String(e) });
  }
};

function parseForm(s){
  const out = {};
  for (const part of s.split('&')) {
    if (!part) continue;
    const [k,v=''] = part.split('=');
    out[decodeURIComponent(k.replace(/\+/g,' '))] =
        decodeURIComponent(v.replace(/\+/g,' '));
  }
  return out;
}
function res(status, body){
  return {
    statusCode: status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    },
    body: JSON.stringify(body),
  };
}
