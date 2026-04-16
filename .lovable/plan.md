

## Suppression de la fonction temporaire get-service-key

La clé a été récupérée. Il faut maintenant supprimer la fonction `get-service-key` pour des raisons de sécurité.

### Étape unique
- Supprimer le fichier `supabase/functions/get-service-key/index.ts`
- Supprimer la fonction déployée via l'outil de suppression d'Edge Functions

