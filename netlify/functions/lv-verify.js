exports.handler = async (event) => {
  try{
    const APPS_EXEC   = process.env.APPS_EXEC;
    const MARK_SECRET = process.env.MARK_SECRET;
    if (!APPS_EXEC || !MARK_SECRET) return redir('/', 'missing');

    const qs   = event.queryStringParameters || {};
    const step = Number(qs.step||qs.s||qs.lv);
    const hwid = (qs.hwid||'').trim();
    const hash = (qs.hash||'').trim();

    if (step!==1 && step!==2) return redir('/', 'badstep');

    const ref = (event.headers.referer || event.headers.referrer || '').toLowerCase();
    const okRef  = ref.includes('linkvertise') || ref.includes('link-hub.net');
    const okHash = hash && hash.length >= 16; // relax
    if (!(okRef || okHash)) {
      const tail = hwid ? ('?bypass=1&hwid='+encodeURIComponent(hwid)) : '?bypass=1';
      return redir('/' + tail, 'bypass');
    }

    // Mark progress on backend
    const payload = { action:'progress_mark', hwid, step, markSecret: MARK_SECRET };
    await fetch(APPS_EXEC, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });

    const tail = hwid ? ('?hwid='+encodeURIComponent(hwid)) : '';
    return redir('/' + tail);
  }catch(_){ return redir('/', 'err'); }
};

function redir(path, r){ return { statusCode:302, headers:{ Location: r ? (path+(path.includes('?')?'&':'?')+'r='+r) : path }, body:'' }; }
