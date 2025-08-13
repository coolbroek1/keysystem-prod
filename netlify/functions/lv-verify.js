// lv-verify.js — verifies Linkvertise referrer + hash, marks progress on server
exports.handler = async (event) => {
  try{
    const APPS_EXEC   = process.env.APPS_EXEC;
    const MARK_SECRET = process.env.MARK_SECRET;
    if (!APPS_EXEC || !MARK_SECRET) return redirect('/', 'missing-config');

    const qs   = event.queryStringParameters || {};
    const step = Number(qs.step||qs.s||qs.lv);
    let hwid   = (qs.hwid||'').trim();
    const hash = (qs.hash||'').trim();

    if (step!==1 && step!==2) return redirect('/', 'bad-step');

    // must come from Linkvertise/link-hub + must have a long-ish hash
    const ref = (event.headers.referer || event.headers.referrer || '').toLowerCase();
    const okRef = ref.includes('linkvertise') || ref.includes('link-hub.net');
    const okHash = hash && hash.length >= 40;

    if (!(okRef && okHash)) {
      const tail = hwid ? ('?bypass=1&hwid='+encodeURIComponent(hwid)) : '?bypass=1';
      return redirect('/' + tail, 'bypass');
    }

    // mark progress on Apps Script
    const payload = { action:'progress_mark', hwid, step, markSecret: MARK_SECRET };
    const r = await fetch(APPS_EXEC, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    // ignore body; always redirect back to portal with hwid (if we got one)
    const tail = hwid ? ('?hwid='+encodeURIComponent(hwid)) : '';
    return redirect('/' + tail);
  }catch(e){
    return redirect('/', 'err');
  }
};

function redirect(path, r){
  return { statusCode:302, headers:{ Location: r ? (path+(path.includes('?')?'&':'?')+'r='+r) : path }, body:'' };
}
