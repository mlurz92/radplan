export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const action = url.searchParams.get('action');

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    "Pragma": "no-cache",
    "Expires": "0"
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!env.RADPLAN_KV) {
    return new Response(JSON.stringify({ error: "KV namespace binding missing" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  }

  if (action === "load") {
    if (request.method !== "GET") {
      return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
        status: 405,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }

    try {
      const data = await env.RADPLAN_KV.get("RADPLAN_DATA");
      
      if (data) {
        return new Response(data, {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders
          }
        });
      } else {
        return new Response(JSON.stringify({ main: {}, plans: {}, lastModified: 0 }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders
          }
        });
      }
    } catch (e) {
      return new Response(JSON.stringify({ error: "KV read error" }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
  }

  if (action === "save") {
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
        status: 405,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }

    try {
      const bodyText = await request.text();
      const parsedData = JSON.parse(bodyText);
      
      parsedData.lastModified = Date.now();
      
      const dataToSave = JSON.stringify(parsedData);
      await env.RADPLAN_KV.put("RADPLAN_DATA", dataToSave);
      
      return new Response(JSON.stringify({ success: true, lastModified: parsedData.lastModified }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: "Invalid JSON or KV write error" }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
  }

  return new Response(JSON.stringify({ error: "Invalid action parameter" }), {
    status: 400,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders
    }
  });
}
