// netlify/functions/lv-verify.js
// Verifieert Linkvertise "hash" server-side zodat bypass-sites niet werken.
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return cors(200, {});
  if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
    return cors(405, { ok:false, error:'method_not_allowed' });
  }

  try {
    const LV_TOKEN = process.env.LV_TOKEN;
    if (!LV_TOKEN) return cors(500, { ok:false, error:'missing_LV_TOKEN' });

    // query of JSON body beide toestaan
    let q = event.queryStringParameters || {};
    if (!q || Object.keys(q).length === 0 && event.body) {
      try { q = JSON.parse(event.body); } catch (_) {}
    }

    const step = String(q.step || '').trim();        // "1" of "2"
    const hash = String(q.hash || '').trim();
    const hwid = (q.hwid && String(q.hwid)) || '';

    if (step !== '1' && step !== '2') {
      return cors(400, { ok:false, error:'bad_step' });
    }
    if (!/^[a-f0-9]{64}$/i.test(hash)) {
      return cors(400, { ok:false, error:'bad_hash' });
    }

    // ---- Officiële verificatie bij Linkvertise (twee pogingen, verschillen per account) ----
    let verified = false, debug = '';

    // 1) Bearer endpoint (veel gebruikt)
    try {
      const r1 = await fetch(`https://publisher.linkvertise.com/api/v1/verify?hash=${encodeURIComponent(hash)}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${LV_TOKEN}`, 'Accept': 'application/json' }
      });
      const t1 = await r1.text(); debug += `try1:${r1.status}:${t1.slice(0,120)}|`;
      let d1 = {};
      try { d1 = JSON.parse(t1); } catch(_) {}
      if (r1.ok && (d1.valid === true || (d1.data && d1.data.valid === true))) verified = true;
    } catch (e) { debug += `try1_error:${String(e).slice(0,80)}|`; }

    // 2) Query token variant (sommige accounts)
    if (!verified) {
      try {
        const r2 = await fetch(`https://publisher.linkvertise.com/api/v1/verify?hash=${encodeURIComponent(hash)}&token=${encodeURIComponent(LV_TOKEN)}`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        });
        const t2 = await r2.text(); debug += `try2:${r2.status}:${t2.slice(0,120)}|`;
        let d2 = {};
        try { d2 = JSON.parse(t2); } catch(_) {}
        if (r2.ok && (d2.valid === true || (d2.data && d2.data.valid === true))) verified = true;
      } catch (e) { debug += `try2_error:${String(e).slice(0,80)}|`; }
    }

    if (!verified) {
      return cors(200, { ok:false, error:'not_verified' /*, debug*/ });
    }

    // Alles goed
    return cors(200, { ok:true, step, hwid: hwid || undefined });
  } catch (e) {
    return cors(500, { ok:false, error:String(e) });
  }
};

function cors(status, body){
  return {
    statusCode: status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    },
    body: JSON.stringify(body)
  };
}
