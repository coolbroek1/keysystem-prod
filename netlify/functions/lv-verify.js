exports.handler = async (event) => {
  const cors = (status, body) => ({
    statusCode: status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    },
    body: JSON.stringify(body),
  });

  if (event.httpMethod === "OPTIONS") return cors(200, {});
  if (event.httpMethod !== "GET" && event.httpMethod !== "POST")
    return cors(405, { ok:false, error:"method_not_allowed" });

  try{
    const LV_TOKEN = process.env.LV_TOKEN; // <- set in Netlify env
    if(!LV_TOKEN) return cors(500, { ok:false, error:"missing_LV_TOKEN" });

    const p = event.queryStringParameters || {};
    const hash = (p.hash || "").trim();
    const step = (p.step || "").trim(); // "1" or "2"
    if(!hash || (step!=="1" && step!=="2")) return cors(400, { ok:false, error:"bad_params" });

    // Verify at Linkvertise (hash valid only ~10s!)
    const url = `https://publisher.linkvertise.com/api/v1/anti_bypassing?token=${encodeURIComponent(LV_TOKEN)}&hash=${encodeURIComponent(hash)}`;
    const r = await fetch(url, { method:"POST" });
    const text = await r.text(); // "TRUE" or "FALSE" or "Invalid token."
    const ok = text.toUpperCase().includes("TRUE");

    return cors(200, { ok, step, raw:text });
  }catch(e){
    return cors(500, { ok:false, error:String(e) });
  }
};
