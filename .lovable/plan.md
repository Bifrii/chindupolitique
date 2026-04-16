

## Plan : Edge Function temporaire pour récupérer la Service Role Key

### Objectif
Créer une edge function `get-service-key` qui retourne la `SUPABASE_SERVICE_ROLE_KEY` une seule fois, protégée par le header `x-api-key`, puis la supprimer immédiatement après usage.

### Avertissement sécurité
La Service Role Key donne un accès complet à votre base de données en contournant toutes les règles RLS. Ne la partagez jamais publiquement. Utilisez-la uniquement dans un environnement serveur sécurisé (ex: OpenClaw).

### Étapes

**1. Créer `supabase/functions/get-service-key/index.ts`**
- Vérifie le header `x-api-key` contre `OPERATIONS_API_KEY`
- Retourne `SUPABASE_SERVICE_ROLE_KEY` en JSON
- Réponse unique — la fonction sera supprimée juste après

**2. Déployer et tester**
- Déployer la fonction
- Tester avec curl pour confirmer qu'elle retourne la clé

**3. Supprimer la fonction**
- Supprimer le code et la fonction déployée immédiatement après récupération de la clé

### Appel attendu
```
curl -H "x-api-key: VOTRE_CLE" \
  https://otktarqhxbdgvmvwyrxz.supabase.co/functions/v1/get-service-key
```

### Résultat
```json
{ "service_role_key": "eyJ..." }
```

