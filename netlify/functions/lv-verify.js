// netlify/functions/lv-verify.js
exports.handler = async (event) => {
  const cors = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
  };
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: cors, body: "{}" };

  try {
    const q = event.queryStringParameters || {};
    const step = String(q.step || "");
    const hash = String(q.hash || "");
    const token = process.env.LV_TOKEN || "";

    if (!/^[12]$/.test(step)) {
      return { statusCode: 400, headers: cors, body: JSON.stringify({ ok:false, error:"bad_step" }) };
    }
    if (!token || token.length !== 64) {
      return { statusCode: 500, headers: cors, body: JSON.stringify({ ok:false, error:"missing_LV_TOKEN" }) };
    }
    if (!hash || hash.length !== 64) {
      return { statusCode: 400, headers: cors, body: JSON.stringify({ ok:false, error:"missing_hash" }) };
    }

    // Linkvertise anti-bypass endpoint (returns "TRUE" or "FALSE")
    // Spec uit hun PDF: publisher.linkvertise.com/api/v1/anti_bypassing?token=...&hash=...
    const url = `https://publisher.linkvertise.com/api/v1/anti_bypassing?token=${encodeURIComponent(token)}&hash=${encodeURIComponent(hash)}`;
    const r = await fetch(url, { method: "POST" });
    const text = (await r.text()).trim().toUpperCase(); // "TRUE" or "FALSE"

    if (text === "TRUE") {
      return { statusCode: 200, headers: cors, body: JSON.stringify({ ok:true, step: Number(step) }) };
    }
    // FALSE of iets anders → niet geverifieerd
    return { statusCode: 200, headers: cors, body: JSON.stringify({ ok:false, error:"not_verified" }) };
  } catch (e) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ ok:false, error:String(e) }) };
  }
};
