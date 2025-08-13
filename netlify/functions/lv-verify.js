// Simple anti-bypass gate for Linkvertise steps
// Accepts JSON: { step:"1"|"2", hash:"...", hwid?: "...", ref?: document.referrer }
const ALLOWED_REFS = [
  "linkvertise.com",
  "linkvertise.net",
  "link-center.net",
  "link-target.net",
  "direct-link.net",
  "link-hub.net" // <-- jouw domein
];

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return cors(200, {});
  if (event.httpMethod !== "POST") return cors(405, { ok:false, error:"method_not_allowed" });

  let body = {};
  try { body = JSON.parse(event.body || "{}"); } catch (_) {}

  const step = String(body.step || "");
  const hash = String(body.hash || "");
  const ref  = String(body.ref  || ""); // document.referrer vanaf de lv-pagina

  if (!step || !["1","2"].includes(step)) return cors(200, { ok:false, error:"bad_step" });
  if (!hash) return cors(200, { ok:false, error:"missing_hash" });

  // Basale anti-bypass: referrer moet een Linkvertise-domein zijn
  const fromAllowed = ALLOWED_REFS.some(d => ref.toLowerCase().includes(d));
  if (!fromAllowed) {
    return cors(200, { ok:false, error:"bypass_detected", reason:"bad_referrer" });
  }

  // Optioneel: minimale hash-lengte (tegen triviale strings)
  if (hash.length < 32) {
    return cors(200, { ok:false, error:"bypass_detected", reason:"hash_too_short" });
  }

  // Alles goed
  return cors(200, { ok:true });
};

function cors(status, body){
  return {
    statusCode: status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
    body: JSON.stringify(body),
  };
}
