exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return cors(200, {});
  if (event.httpMethod !== 'POST')    return cors(405, { ok:false, error:'method_not_allowed' });

  try {
    const APPS_EXEC    = process.env.APPS_EXEC;
    const ADMIN_SECRET = process.env.ADMIN_SECRET;
    if (!APPS_EXEC)    return cors(500, { ok:false, error:'missing_APPS_EXEC' });
    if (!ADMIN_SECRET) return cors(500, { ok:false, error:'missing_ADMIN_SECRET' });

    const req = JSON.parse(event.body || '{}');
    const payload = { action:'admin_reset_hwid', hwid:req.hwid, adminSecret: ADMIN_SECRET };

    const r = await fetch(APPS_EXEC, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    const txt = await r.text(); // pass through JSON from Apps Script
    return cors(r.ok ? 200 : 500, txt, true);
  } catch (e) {
    return cors(500, { ok:false, error:String(e) });
  }
};

function cors(status, body, passthrough=false){
  return {
    statusCode: status,
    headers: {
      'Content-Type':'application/json',
      'Access-Control-Allow-Origin':'*',
      'Access-Control-Allow-Headers':'Content-Type',
      'Access-Control-Allow-Methods':'POST, OPTIONS',
    },
    body: passthrough ? body : JSON.stringify(body),
  };
}
