exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return resp(200, {});
  if (event.httpMethod !== 'POST')   return resp(405, { ok:false, error:'method_not_allowed' });
  try {
    const APPS_EXEC = process.env.APPS_EXEC;
    if (!APPS_EXEC) return resp(500, { ok:false, error:'missing_APPS_EXEC' });

    const h = event.headers || {};
    const ct = (h['content-type'] || h['Content-Type'] || '').toLowerCase();

    let payload = {};
    if (ct.includes('application/x-www-form-urlencoded')) {
      payload = parseForm(event.body || '');
    } else {
      payload = JSON.parse(event.body || '{}');
    }

    console.log(`[keyproxy] ct=${ct} isB64=${!!event.isBase64Encoded} len=${(event.body||'').length} action=${payload.action}`);

    const r = await fetch(APPS_EXEC, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify(payload),
    });

    const text = await r.text();
    console.log(`[keyproxy] RESP ${r.status} ${text.slice(0,200)}`);
    return resp(r.ok ? 200 : 500, text, true);
  } catch (e) {
    console.error('[keyproxy] error', e);
    return resp(500, { ok:false, error:String(e) });
  }
};

function parseForm(b){const o={};for(const p of String(b).split('&')){if(!p)continue;const[k,v='']=p.split('=');o[decodeURIComponent(k.replace(/\+/g,' '))]=decodeURIComponent(v.replace(/\+/g,' '));}return o;}
function resp(s, body, passthrough=false){return{statusCode:s,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'POST, OPTIONS'},body: passthrough?body:JSON.stringify(body)};}
