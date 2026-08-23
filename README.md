# Finterest

Finterest est une application de bureau **locale et hors ligne** qui aide une seule personne à visualiser clairement son budget mensuel — beaucoup plus lisiblement qu'avec une simple calculatrice. Toutes vos données restent sur votre ordinateur : aucune connexion à une banque, aucun compte en ligne, aucune donnée envoyée sur internet (à l'exception, optionnelle, de la vérification des mises à jour).

## Fonctionnalités

**Budget simple**
- Revenu mensuel et calcul automatique du reste à vivre.
- Abonnements et prélèvements récurrents, avec une distinction claire entre les deux (badge Abonnement / Prélèvement).
- Achats prévus, mois par mois.
- Prêts bancaires (montant emprunté, mensualité, taux, durée restante), dont les mensualités sont comptées dans votre reste à vivre.
- Calendrier mensuel affichant vos abonnements et prélèvements sur leur jour de paiement, avec ajout direct depuis une date.
- Vue d'ensemble avec anneau de progression et résumé du mois.

**Calcul avancé**
- Simulateur d'intérêts composés indépendant du budget, avec capital de départ, investissement mensuel régulier, taux annuel et durée — pour estimer la valeur future d'une épargne programmée. Ce calcul est fourni à titre indicatif et ne remplace pas un conseil financier.

**Comptes et confidentialité**
- Plusieurs comptes locaux sur le même ordinateur, chacun avec son propre budget et un code secret (PIN).
- Écran de sélection des comptes avec photo de profil, pseudonyme personnalisable, et création/suppression de comptes depuis un écran dédié.
- Changement de compte sans fermer l'application.
- Interface disponible en français et en anglais.
- Thème clair, sombre, ou automatique selon les préférences de votre système.

**Sauvegarde**
- Export de votre budget dans un fichier de sauvegarde unique, à tout moment.
- Import de ce fichier pour restaurer vos données, y compris sur un autre ordinateur.

**Mises à jour**
- Vérification automatique des mises à jour au démarrage (Windows), et bouton de vérification manuelle dans les réglages.

## Installation

### Windows
Téléchargez le dernier installeur (`Finterest Setup x.x.x.exe`) depuis les [Releases](../../releases) du dépôt, puis lancez-le. Finterest s'installe pour votre utilisateur, sans droits administrateur.

### macOS et Linux
Des versions macOS (`.dmg`) et Linux (`AppImage`) sont **prévues** mais **pas encore disponibles** — ce n'est pas la priorité actuelle du projet. Windows reste la seule plateforme activement distribuée pour le moment.

## Utilisation

1. Au premier lancement, créez un compte local avec un nom et un code secret à 4-8 chiffres.
2. Renseignez votre revenu mensuel, ajoutez vos abonnements/prélèvements, vos achats prévus et vos éventuels prêts.
3. Consultez la vue d'ensemble pour voir votre reste à vivre du mois.
4. Depuis les réglages, personnalisez l'apparence (thème, langue), exportez une sauvegarde régulièrement, ou vérifiez les mises à jour disponibles.
5. Depuis l'écran de sélection des comptes, créez ou supprimez des comptes locaux, ou changez de compte à tout moment depuis votre profil.

## Vos données

Votre budget est stocké uniquement sur votre ordinateur, dans le dossier de données de l'application. Aucune information n'est envoyée à un tiers. Utilisez régulièrement la fonction d'export pour conserver une copie de sauvegarde de vos données, notamment avant de désinstaller l'application ou de changer d'ordinateur.

## En savoir plus

- [`PATCH_NOTES.md`](PATCH_NOTES.md) — historique des versions, orienté utilisateur.
- [`USER_UPDATE_SUMMARY.txt`](USER_UPDATE_SUMMARY.txt) — explication en langage simple de chaque mise à jour.
- [`DEV_CHANGES.md`](DEV_CHANGES.md) — journal technique détaillé de chaque session de développement.

## Pour les développeurs

Stack : Electron, TypeScript, React, SQL.js (SQLite local), Vite + tsup, Jest, electron-updater/electron-builder.

Prérequis : Node.js 20 ou plus récent.

```
npm install                 # installe les dépendances
npm run dev                  # lance l'app en développement (Vite + Electron)
npm run build                 # build de production (renderer + main process)
npm run dist:win              # génère l'installeur Windows (install/windows/)
npm run typecheck              # vérification TypeScript
npm run lint                    # ESLint
npm test                         # tests Jest
```

Architecture en bref :
- `src/electron/` — process principal Electron, pont preload, et couche de persistance locale (SQLite via sql.js).
- `src/renderer/` — interface React ; `src/renderer/components/` contient les écrans (compte, calendrier, prêts, réglages, profil, tableau de bord) ; `i18n.ts` et `theme.ts` gèrent respectivement la langue et le thème clair/sombre/système.
- `src/shared/` — types et calculs de budget partagés entre les deux processus.
- `assets/` et `build/` — logo, icônes source, et icône packagée pour Windows/macOS/Linux.

Le journal technique complet de chaque changement se trouve dans [`DEV_CHANGES.md`](DEV_CHANGES.md).
