# ATS Project

## Supabase

```bash
supabase login
supabase link
supabase db push
supabase start
supabase functions serve
supabase functions deploy
```

## Edge Function `process-candidate`

La función exige **JWT válido** del proyecto (`verify_jwt = true` en `supabase/config.toml`). Cada petición debe incluir:

```http
Authorization: Bearer <JWT>
```

Puedes usar la **anon key** (desde el dashboard o `supabase status` en local) para pruebas. No commitees claves; usa variables de entorno o un gestor de secretos.

### Probar en local

Define la anon key (por ejemplo la que muestra `supabase status`) y llama con POST:

**PowerShell:**

```powershell
$env:SUPABASE_ANON_KEY = "<anon_key_desde_supabase_status>"
curl.exe -X POST "http://127.0.0.1:54321/functions/v1/process-candidate" `
  -H "Authorization: Bearer $env:SUPABASE_ANON_KEY" `
  -H "Content-Type: application/json" `
  -d "@examples/process-candidate-request.json"
```

**Bash:**

```bash
export SUPABASE_ANON_KEY="<anon_key>"
curl -sS -X POST "http://127.0.0.1:54321/functions/v1/process-candidate" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d @examples/process-candidate-request.json
```

Sin la cabecera `Authorization`, el gateway responde **401** antes de ejecutar la función.

### Producción

Tras `supabase functions deploy process-candidate`, usa la URL del proyecto:

`https://<PROJECT_REF>.supabase.co/functions/v1/process-candidate`

Misma cabecera `Authorization: Bearer <anon_key_o_JWT_de_usuario>`. Vuelve a desplegar la función si cambias `verify_jwt` en `config.toml`.

**Nota:** La **service_role** solo debe usarse en servidores de confianza; no la expongas en clientes públicos.
