exports.handler = async (event) => {
  try {
    const APPS_EXEC = process.env.APPS_EXEC;
    if (!APPS_EXEC) return resp(500, { ok:false, error:'missing_APPS_EXEC' });

    if (event.httpMethod === 'OPTIONS') return resp(200, {});

    if (event.httpMethod === 'GET') {
      const qs = event.queryStringParameters || {};
      const url = APPS_EXEC + '?' + toQS(qs);
      const r = await fetch(url, { method: 'GET' });
      const text = await r.text();
      return resp(r.ok ? 200 : 500, text, true);
    }

    if (event.httpMethod !== 'POST') return resp(405, { ok:false, error:'method_not_allowed' });

    const ct = (event.headers['content-type'] || event.headers['Content-Type'] || '').toLowerCase();
    let payload = {};
    if (ct.includes('application/x-www-form-urlencoded')) payload = parseForm(event.body || '');
    else payload = JSON.parse(event.body || '{}');

    const r = await fetch(APPS_EXEC, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    const text = await r.text();
    return resp(r.ok ? 200 : 500, text, true);
  } catch (e) {
    return resp(500, { ok:false, error:String(e) });
  }
};

function toQS(obj){ return Object.keys(obj).map(k=>encodeURIComponent(k)+'='+encodeURIComponent(obj[k]??'')).join('&'); }
function parseForm(body){ const out={}; for (const part of (body||'').split('&')){ if(!part) continue; const [k,v='']=part.split('='); out[decodeURIComponent(k.replace(/\+/g,' '))]=decodeURIComponent(v.replace(/\+/g,' ')); } return out; }
function resp(status, body, passthrough=false){
  return { statusCode: status, headers: {
    'Content-Type':'application/json','Access-Control-Allow-Origin':'*',
    'Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'GET, POST, OPTIONS'
  }, body: passthrough ? body : JSON.stringify(body) };
}
