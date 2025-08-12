// netlify/functions/lv-verify.js
exports.handler = async (event) => {
  const LV_TOKEN = process.env.LV_TOKEN; // set in Netlify env
  if (!LV_TOKEN) return reply(500, { ok:false, error:'missing_LV_TOKEN' });

  // Accept both POST JSON and GET query (Linkvertise can vary)
  let step, hash;
  if (event.httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body || '{}');
      step = String(body.step || '').trim();
      hash = String(body.hash || '').trim();
    } catch { /* ignore */ }
  } else {
    const q = event.queryStringParameters || {};
    step = String(q.step || q.lv || '').trim();
    hash = String(q.hash || '').trim();
  }

  if (!step || !hash) return reply(400, { ok:false, error:'missing_params' });

  // Very simple HMAC-like constant-time compare:
  // In real life you’d replicate Linkvertise doc algo exactly.
  const ok = await pseudoCheck(hash, LV_TOKEN);
  return reply(200, { ok });
};

async function pseudoCheck(hash, token) {
  // Placeholder: accept any 64+ length hex when token is set.
  // Replace with your real anti-bypass formula when you have it.
  return Boolean(token) && /^[a-f0-9]{64,}$/i.test(hash);
}

function reply(status, body){
  return {
    statusCode: status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(body)
  };
}
