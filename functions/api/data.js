export async function onRequestGet(context) {
  try {
    if (!context.env.RADPLAN_KV) {
      return new Response(JSON.stringify({ error: "KV namespace binding RADPLAN_KV is missing" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    const value = await context.env.RADPLAN_KV.get("radplan_state");
    
    if (value) {
      return new Response(value, {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    const defaultState = {
      main: {},
      drafts: {}
    };

    return new Response(JSON.stringify(defaultState), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: "Internal Server Error during GET", details: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function onRequestPost(context) {
  try {
    if (!context.env.RADPLAN_KV) {
      return new Response(JSON.stringify({ error: "KV namespace binding RADPLAN_KV is missing" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    const body = await context.request.text();
    
    if (!body) {
      return new Response(JSON.stringify({ error: "Empty request body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    await context.env.RADPLAN_KV.put("radplan_state", body);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: "Internal Server Error during POST", details: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}