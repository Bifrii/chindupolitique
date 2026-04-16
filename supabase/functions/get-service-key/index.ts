const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const apiKey = req.headers.get('x-api-key')
  const expectedKey = Deno.env.get('OPERATIONS_API_KEY')

  if (!apiKey || apiKey !== expectedKey) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  return new Response(JSON.stringify({ service_role_key: serviceRoleKey }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
