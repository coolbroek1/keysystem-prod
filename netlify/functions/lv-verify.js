exports.handler = async (event) => {
  try{
    const APPS_EXEC   = process.env.APPS_EXEC;
    const MARK_SECRET = process.env.MARK_SECRET;
    if (!APPS_EXEC || !MARK_SECRET) return redirect('/', 'missing-config');

    const qs   = event.queryStringParameters || {};
    const step = Number(qs.step||qs.s||qs.lv);
    const hwid = (qs.hwid||'').trim();
    const hash = (qs.hash||'').trim();

    if (step!==1 && step!==2) return redirect('/', 'bad-step');
    if (!hwid) return redirect('/', 'no-hwid');

    // eenvoudige anti-bypass: referrer moet linkvertise / link-hub zijn en hash moet “echt” lijken
    const ref = (event.headers.referer || event.headers.referrer || '').toLowerCase();
    const okRef = ref.includes('linkvertise') || ref.includes('link-hub.net');
    const okHash = hash && hash.length >= 40; // (pas aan met jouw strengere check indien gewenst)

    if (!(okRef && okHash)){
      return redirect('/?bypass=1&hwid='+encodeURIComponent(hwid), 'bypass');
    }

    // markeer progress op Apps Script
    const payload = { action:'progress_mark', hwid, step, markSecret: MARK_SECRET };
    const r = await fetch(APPS_EXEC, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    // negeer body; stuur altijd terug naar portal
    return redirect('/?hwid='+encodeURIComponent(hwid));
  }catch(e){
    return redirect('/', 'err');
  }
};

function redirect(path, r){
  return { statusCode:302, headers:{ Location: r ? (path+(path.includes('?')?'&':'?')+'r='+r) : path }, body:'' };
}
