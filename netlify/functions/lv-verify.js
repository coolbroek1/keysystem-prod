// netlify/functions/lv-verify.js
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return cors(200, {});
  if (event.httpMethod !== 'POST')   return cors(405, {ok:false,error:'method_not_allowed'});

  try {
    const { step, hash } = JSON.parse(event.body || '{}');
    if (!step || !hash)              return cors(200, {ok:false,error:'missing_params'});
    const TOKEN = process.env.LV_TOKEN;
    if (!TOKEN)                      return cors(500, {ok:false,error:'missing_LV_TOKEN'});
    if (hash !== TOKEN)              return cors(200, {ok:false,error:'bad_hash'});

    // ok: laat frontend de flag zetten
    return cors(200, { ok:true });
  } catch (e) {
    return cors(500, {ok:false,error:String(e)});
  }
};

function cors(status, body){
  return {
    statusCode: status,
    headers: {
      'Content-Type':'application/json',
      'Access-Control-Allow-Origin':'*',
      'Access-Control-Allow-Headers':'Content-Type',
      'Access-Control-Allow-Methods':'POST,OPTIONS'
    },
    body: JSON.stringify(body)
  };
}
