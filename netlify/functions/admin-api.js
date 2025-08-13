// netlify/functions/admin-api.js
exports.handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') return resp(200, {});
  if (event.httpMethod !== 'POST') return resp(405, { ok:false, error:'method_not_allowed' });

  try {
    const APPS_EXEC   = process.env.APPS_EXEC;    // je Apps Script /exec URL
    const ADMIN_PASS  = process.env.ADMIN_PASS || 'aze'; // simpel UI-wachtwoord
    const ADMIN_SECRET= process.env.ADMIN_SECRET; // moet gelijk zijn aan Apps Script ADMIN_SECRET

    if (!APPS_EXEC)    return resp(500, { ok:false, error:'missing_APPS_EXEC' });
    if (!ADMIN_SECRET) return resp(500, { ok:false, error:'missing_ADMIN_SECRET' });

    let body = {};
    try { body = JSON.parse(event.body || '{}'); } catch(_) { body = {}; }

    // simpele login
    if ((body.pass || '') !== ADMIN_PASS) {
      return resp(403, { ok:false, error:'forbidden' });
    }

    const action = String(body.action || '');
    const hwid   = String(body.hwid || '');

    // mappen naar Apps Script acties
    let payload = null;
    if (action === 'admin_issue_key') {
      if (!hwid) return resp(400, { ok:false, error:'missing_hwid' });
      payload = { action:'admin_issue_key', hwid, adminSecret: ADMIN_SECRET };
    } else if (action === 'admin_reset_hwid_and_purge') {
      if (!hwid) return resp(400, { ok:false, error:'missing_hwid' });
      payload = { action:'admin_reset_hwid_and_purge', hwid, adminSecret: ADMIN_SECRET };
    } else if (action === 'lookup_active_key') {
      // kan ook via keyproxy, maar hier toegestaan voor gemak
      if (!hwid) return resp(400, { ok:false, error:'missing_hwid' });
      payload = { action:'lookup_active_key', hwid };
    } else {
      return resp(400, { ok:false, error:'unknown_action' });
    }

    const r = await fetch(APPS_EXEC, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify(payload)
    });
    const text = await r.text(); // passthrough JSON
    return resp(r.ok ? 200 : 500, text, true);
  } catch (e) {
    return resp(500, { ok:false, error:String(e) });
  }
};

function resp(status, body, passthrough=false){
  return {
    statusCode: status,
    headers: {
      'Content-Type':'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    },
    body: passthrough ? body : JSON.stringify(body),
  };
}
