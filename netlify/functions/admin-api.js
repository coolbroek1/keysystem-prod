exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return resp(200, {});
  if (event.httpMethod !== 'POST')     return resp(405, { ok:false, error:'method_not_allowed' });
  try{
    const APPS_EXEC    = process.env.APPS_EXEC;
    const ADMIN_SECRET = process.env.ADMIN_SECRET;
    if (!APPS_EXEC || !ADMIN_SECRET) return resp(500, { ok:false, error:'missing_env' });

    const { action, hwid, pass } = JSON.parse(event.body||'{}');
    if (pass !== 'aze') return resp(403, { ok:false, error:'bad_password' });

    let payload;
    if (action === 'admin_issue_key'){
      payload = { action:'admin_issue_key', hwid, adminSecret: ADMIN_SECRET };
    } else if (action === 'admin_reset_hwid'){
      payload = { action:'admin_reset_hwid', hwid, adminSecret: ADMIN_SECRET };
    } else {
      return resp(400, { ok:false, error:'bad_action' });
    }

    const r = await fetch(APPS_EXEC, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    const text = await r.text();
    return resp(r.ok?200:500, text, true);
  }catch(e){ return resp(500, { ok:false, error:String(e) }); }
};

function resp(status, body, passthrough=false){
  return { statusCode:status, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'POST, OPTIONS'}, body: passthrough?body:JSON.stringify(body) };
}
