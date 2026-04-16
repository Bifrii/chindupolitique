

## Problème

Deux sujets à traiter :

1. **Erreur de build** : `Index.tsx` importe `Testimonials` depuis `./Testimonials` (même dossier `pages/`), mais le fichier est dans `src/components/Testimonials.tsx`. L'import doit être corrigé.

2. **Service Role Key introuvable** : Cette clé est un secret interne au backend Lovable Cloud. Elle est automatiquement disponible dans les Edge Functions via `Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")` — vous n'avez pas besoin de la trouver manuellement. Votre endpoint `daily-operations-summary` l'utilise déjà correctement.

## Plan

### Étape 1 — Corriger l'erreur de build

Modifier `src/pages/Index.tsx` ligne 1 :
- Changer `import Testimonials from "./Testimonials"` en `import Testimonials from "@/components/Testimonials"`

### Étape 2 — Accès à la Service Role Key

Aucune action code nécessaire. Pour donner accès à un agent externe (OpenClaw), il suffit d'utiliser la clé API `OPERATIONS_API_KEY` que vous avez déjà configurée. L'endpoint est :

```
curl -H "x-api-key: VOTRE_CLE" https://otktarqhxbdgvmvwyrxz.supabase.co/functions/v1/daily-operations-summary
```

La Service Role Key reste un secret interne — elle n'a pas besoin d'être exposée.

