exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return resp(200, {});
  if (event.httpMethod !== 'POST')    return resp(405, { ok:false, error:'method_not_allowed' });

  try {
    const APPS_EXEC = process.env.APPS_EXEC;
    const ADMIN_SECRET = process.env.ADMIN_SECRET; // zelfde als in Apps Script
    if (!APPS_EXEC)   return resp(500, { ok:false, error:'missing_APPS_EXEC' });
    if (!ADMIN_SECRET) return resp(500, { ok:false, error:'missing_ADMIN_SECRET' });

    const req = JSON.parse(event.body || '{}');
    const op = req.op;

    // map UI-op -> Apps Script action + payload
    let payload = null;
    if (op === 'issue')         payload = { action:'admin_issue_key',  hwid:req.hwid, adminSecret:ADMIN_SECRET };
    else if (op === 'lookup_hwid') payload = { action:'admin_lookup_hwid', hwid:req.hwid, adminSecret:ADMIN_SECRET };
    else if (op === 'reset_hwid')  payload = { action:'admin_reset_hwid',  hwid:req.hwid, adminSecret:ADMIN_SECRET };
    else if (op === 'delete_key')  payload = { action:'admin_delete_key',  key:req.key,  adminSecret:ADMIN_SECRET };
    else return resp(400, { ok:false, error:'unknown_op' });

    const r = await fetch(APPS_EXEC, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify(payload)
    });
    const text = await r.text();
    return resp(r.ok ? 200 : 500, text, true);
  } catch (e) {
    return resp(500, { ok:false, error:String(e) });
  }
};

function resp(status, body, passthrough=false){
  return {
    statusCode: status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    },
    body: passthrough ? body : JSON.stringify(body),
  };
}
