// dev-issue.js — base64-safe; roept Apps Script admin_issue_key aan
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return cors(200, {});
  if (event.httpMethod !== 'POST')   return cors(405, { ok:false, error:'method_not_allowed' });

  try {
    const APPS_EXEC    = process.env.APPS_EXEC;
    const ADMIN_SECRET = process.env.ADMIN_SECRET; // zelfde als in Apps Script
    if (!APPS_EXEC)    return cors(500, { ok:false, error:'missing_APPS_EXEC' });
    if (!ADMIN_SECRET) return cors(500, { ok:false, error:'missing_ADMIN_SECRET' });

    const headers = event.headers || {};
    const ct = (headers['content-type'] || headers['Content-Type'] || '').toLowerCase();

    const isB64 = !!event.isBase64Encoded;
    let raw = event.body || '';
    if (isB64) {
      try { raw = Buffer.from(raw, 'base64').toString('utf8'); } catch {}
    }

    let req = {};
    try { req = ct.includes('application/x-www-form-urlencoded') ? formToObj(raw) : JSON.parse(raw||'{}'); }
    catch { req = formToObj(raw); }

    const payload = {
      action: 'admin_issue_key',
      hwid: req.hwid,
      adminSecret: ADMIN_SECRET
    };

    console.log(`[dev-issue] isB64=${isB64} action=${payload.action} hwid=${payload.hwid || ''}`);

    const r = await fetch(APPS_EXEC, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify(payload)
    });
    const text = await r.text();
    return cors(r.ok ? 200 : 500, text, true);
  } catch (e) {
    console.error('[dev-issue] error:', e);
    return cors(500, { ok:false, error:String(e) });
  }
};

function formToObj(body){
  const out = {};
  String(body||'').split('&').forEach(p=>{
    if(!p) return;
    const [k,v=''] = p.split('=');
    out[decodeURIComponent(k.replace(/\+/g,' '))] = decodeURIComponent(v.replace(/\+/g,' '));
  });
  return out;
}

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
