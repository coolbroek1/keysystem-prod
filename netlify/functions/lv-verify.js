exports.handler = async (event) => {
  // CORS
  if (event.httpMethod === 'OPTIONS') return resp(200, {});
  if (event.httpMethod !== 'POST')    return resp(405, { ok:false, error:'method_not_allowed' });

  try {
    const LV_TOKEN = process.env.LV_TOKEN; // <-- zet deze env var!
    if (!LV_TOKEN) return resp(500, { ok:false, error:'missing_LV_TOKEN' });

    const req  = JSON.parse(event.body || '{}');
    const hash = (req.hash || '').trim();
    if (!hash || hash.length < 32) return resp(400, { ok:false, error:'missing_hash' });

    const url = `https://publisher.linkvertise.com/api/v1/anti_bypassing?token=${encodeURIComponent(LV_TOKEN)}&hash=${encodeURIComponent(hash)}`;

    // Linkvertise verwacht POST zonder body, response is 'TRUE' of 'FALSE'
    const r   = await fetch(url, { method:'POST' });
    const txt = (await r.text()).trim().toUpperCase();
    const ok  = (txt === 'TRUE');

    return resp(200, { ok }); // ok:true => hash was écht door Linkvertise uitgegeven (en nu ongeldig gemaakt)
  } catch (e) {
    return resp(500, { ok:false, error:String(e) });
  }
};

function resp(status, body){
  return {
    statusCode: status,
    headers: {
      'Content-Type':'application/json',
      'Access-Control-Allow-Origin':'*',
      'Access-Control-Allow-Headers':'Content-Type',
      'Access-Control-Allow-Methods':'POST, OPTIONS'
    },
    body: JSON.stringify(body),
  };
}
