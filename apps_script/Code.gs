// Apps Script backend (Code.gs) — FIXED (no setHeader)
const KEY_TTL_HOURS = Number(PropertiesService.getScriptProperties().getProperty('KEY_TTL_HOURS') || 24);
const TURNSTILE_SECRET = PropertiesService.getScriptProperties().getProperty('TURNSTILE_SECRET');
const ADMIN_SECRET = PropertiesService.getScriptProperties().getProperty('ADMIN_SECRET');

function doPost(e) {
  let req = {};
  const ctype = (e && e.postData && e.postData.type) || "";
  try {
    if (ctype.indexOf("application/json") !== -1) {
      req = JSON.parse(e.postData.contents || "{}");
    } else {
      req = (e && e.parameter) ? e.parameter : {};
    }
  } catch (_) { req = {}; }

  const action = (req.action || "").toString();
  try {
    if (action === 'request_key')       return json(respondRequestKey(req));
    if (action === 'validate_key')      return json(respondValidateKey(req));
    if (action === 'lookup_active_key') return json(respondLookupActiveKey(req));
    if (action === 'admin_issue_key')   return json(respondAdminIssueKey(req));
    return json({ ok:false, error:'unknown_action' });
  } catch (err) { return json({ ok:false, error:String(err) }); }
}

function respondRequestKey({ hwid, turnstileToken }) {
  if (!hwid || !turnstileToken) throw 'missing_hwid_or_token';
  if (!verifyTurnstile(turnstileToken)) throw 'turnstile_failed';
  const key = generateKey();
  const now = Date.now();
  const expiresAt = now + KEY_TTL_HOURS * 3600 * 1000;
  saveKey(key, { hwid: String(hwid), issuedAt: now, expiresAt });
  setLatestKeyForHWID(String(hwid), key);
  return { ok:true, key, ttlHours: KEY_TTL_HOURS, expiresAt };
}

function respondValidateKey({ hwid, key }) {
  if (!hwid || !key) throw 'missing_hwid_or_key';
  const rec = getKey(String(key));
  if (!rec) return { ok:false, error:'invalid' };
  if (String(rec.hwid) !== String(hwid)) return { ok:false, error:'hwid_mismatch' };
  if (Date.now() > Number(rec.expiresAt)) return { ok:false, error:'expired' };
  return { ok:true, expiresAt: Number(rec.expiresAt) };
}

function respondLookupActiveKey({ hwid }) {
  if (!hwid) throw 'missing_hwid';
  const key = getLatestKeyForHWID(String(hwid));
  if (!key) return { ok:false, error:'not_found' };
  const rec = getKey(String(key));
  if (!rec) return { ok:false, error:'not_found' };
  if (Date.now() > Number(rec.expiresAt)) return { ok:false, error:'expired' };
  return { ok:true, key: String(key), expiresAt: Number(rec.expiresAt) };
}

function respondAdminIssueKey({ hwid, adminSecret }) {
  if (!ADMIN_SECRET || String(adminSecret) !== String(ADMIN_SECRET)) throw 'unauthorized';
  if (!hwid) throw 'missing_hwid';
  const key = generateKey();
  const now = Date.now();
  const expiresAt = now + KEY_TTL_HOURS * 3600 * 1000;
  saveKey(key, { hwid: String(hwid), issuedAt: now, expiresAt, admin:true });
  setLatestKeyForHWID(String(hwid), key);
  return { ok:true, key, expiresAt };
}

function verifyTurnstile(token) {
  if (!TURNSTILE_SECRET) throw 'turnstile_secret_not_set';
  const url = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
  const payload = { secret: TURNSTILE_SECRET, response: token };
  const resp = UrlFetchApp.fetch(url, { method: 'post', payload: payload, muteHttpExceptions: true });
  const data = JSON.parse(resp.getContentText() || '{}');
  return !!data.success;
}

function keyStore(){ return PropertiesService.getScriptProperties(); }
function saveKey(key, obj){ keyStore().setProperty('KEY_' + String(key), JSON.stringify(obj)); }
function getKey(key){ const txt = keyStore().getProperty('KEY_' + String(key)); return txt ? JSON.parse(txt) : null; }
function setLatestKeyForHWID(hwid, key){ keyStore().setProperty('HWID_' + String(hwid), String(key)); }
function getLatestKeyForHWID(hwid){ return keyStore().getProperty('HWID_' + String(hwid)); }

function json(body){
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return HtmlService.createHtmlOutput('<meta http-equiv="refresh" content="0; url=https://timely-biscochitos-88e2f6.netlify.app/">');
}

function generateKey(){
  const raw = Utilities.getUuid() + Utilities.getUuid();
  const hash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw);
  return hash.map(b => ('0' + (b & 0xff).toString(16)).slice(-2)).join('').slice(0, 48);
}
