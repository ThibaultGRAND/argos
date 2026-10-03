# F14 — Notifications (version minimale V1)

**Statut** : à tester
**Version cible** : V1 (version minimale) ; V3 pour la version complète
**Dépend de** : [agent_sessions.md](agent_sessions.md), [settings.md](settings.md)
**Écrans** : notifications natives du système ; badge sur l'icône de l'app ; nouvelle ligne « C. Notifications » dans les paramètres

## Problème
Une session pilotée par Argos peut attendre une permission pendant qu'on travaille dans une autre fenêtre :
l'agent est bloqué sans qu'on le sache. Principe produit n°6 : « ne déranger que quand c'est utile ».

## Comportement attendu
- **Seulement quand la fenêtre d'Argos n'a pas le focus**, une notification du système :
  - **« Claude attend ta permission »** : titre de la session, action demandée (« Modifier chats.md ») ;
  - **« Tour terminé »** : titre de la session, durée du tour ;
  - **« Session en erreur »** : titre de la session.
- **Cliquer** la notification ramène Argos au premier plan sur la session concernée.
- **Badge** sur l'icône (macOS, Linux selon le bureau) : nombre de sessions qui attendent une action ; remis à zéro quand plus rien n'attend.
- **Paramètres** : interrupteur « Notifications » (activées par défaut).
- Textes dans la langue choisie.

## Critères d'acceptation
- [ ] Une demande de permission, une fin de tour et une erreur notifient quand Argos est en arrière-plan, et seulement dans ce cas.
- [ ] Le clic sur la notification ouvre la bonne session.
- [ ] Le badge suit le nombre de sessions en attente.
- [x] L'interrupteur des paramètres coupe les notifications.
- [x] Textes en français et en anglais, y compris dans les notifications.

## Conception technique
- Domaine : règle de décision (quel événement notifie, et quand), contenu de la notification sous forme de clés de traduction.
- Ports : `Notifier` (afficher, avec action au clic), `AppPresence` (fenêtre au premier plan, badge).
- Application : service des notifications, branché sur les événements des sessions en direct.
- Principal : notifications Electron, `app.setBadgeCount`, `AppUserModelId` sous Windows ;
  traduction côté principal avec `@intlify/core` et les mêmes catalogues que l'interface (PLAN.md §3.5).
- Préférence `notifications` ajoutée (table `settings` existante, sans migration).
- Événement IPC `app.navigate` `{ sessionId }` pour ouvrir la session au clic.

## Spécificités par fournisseur
Aucune : repose sur les événements normalisés `permission-requested`, `turn-completed`, `status`.

## Hors de cette version (V3)
Réglages par type, regroupement, sons personnalisés, notifications pour les sessions lancées hors d'Argos.

## Bilan de l'implémentation (2026-10-03)
- Logique testée : quand notifier (arrière-plan seulement, interrupteur), contenu traduit côté principal avec `@intlify/core`
  et les catalogues partagés, ouverture de la session au clic, badge des sessions en attente.
- **Non vérifié par Claude** : l'affichage réel des notifications du système et du badge (impossible de capturer l'écran) ;
  à tester par Thibault en laissant Argos en arrière-plan pendant qu'un agent travaille.
- Paramètres : nouvelle section « B. Notifications » (les sections suivantes sont renumérotées).
