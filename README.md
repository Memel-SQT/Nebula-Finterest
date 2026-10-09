# Nebula Finterest

Nebula Finterest est une application de bureau **locale et hors ligne** qui aide une seule personne à visualiser clairement son budget mensuel — beaucoup plus lisiblement qu'avec une simple calculatrice. Toutes vos données restent sur votre ordinateur : aucune connexion à une banque, aucun compte en ligne, aucune donnée envoyée sur internet (à l'exception, optionnelle, de la vérification des mises à jour).

L'application fait partie de la famille **Nebula** et en reprend l'identité visuelle : fonds bleu nuit, accent bleu→violet, halo de nébuleuse en arrière-plan.

## Fonctionnalités

**Budget simple**
- Revenu mensuel et calcul automatique du reste à vivre.
- Abonnements et prélèvements récurrents, avec une distinction claire entre les deux (badge Abonnement / Prélèvement).
- Achats prévus, mois par mois.
- Prêts bancaires (montant emprunté, mensualité, taux, durée restante), dont les mensualités sont comptées dans votre reste à vivre.
- Calendrier mensuel qui réunit, jour par jour, vos abonnements et prélèvements **et** vos achats prévus, avec les totaux du mois. Cliquez sur un jour pour voir ce qui y est prévu, supprimer un élément, ou ajouter directement un **achat ponctuel** (compté une seule fois) ou un abonnement récurrent.
- Les montants se saisissent naturellement : « 12,50 », « 1 234,56 € » ou « 12.5 » sont tous acceptés.
- Vue d'ensemble avec anneau de progression et résumé du mois.

**Budgets, gros budgets et cagnottes**
- **Budgets** (courses, loisirs…) : un montant prévu, et chaque dépense que vous y ajoutez — depuis la carte du budget, le formulaire des achats prévus ou un jour du calendrier — met le budget à jour tout seul : prévu, dépensé, reste.
- Chaque budget est **du mois** (ses dépenses diminuent votre reste à vivre) ou **prévisionnel** (suivi à part, sans toucher au reste à vivre).
- Trois périodes : **chaque mois** (le budget repart à zéro chaque mois), **avec des dates** (début et fin visibles dans le calendrier), ou **sans date**.
- **Sous-enveloppes** : un budget se découpe en parts avec leur propre montant (par exemple Voyage au Japon → Avion, Hébergement, Sur place), chacune avec son reste.
- **Gros budgets** : un menu dédié aux voyages et aux projets, avec les mêmes outils.
- **Cagnottes** : de l'argent mis de côté, alimenté par des versements et des retraits, avec un solde qui se reporte d'un mois à l'autre et un objectif facultatif.
- Les soldes et les restes sont **en vert quand ils sont positifs, en rouge quand ils sont négatifs**, y compris le reste à vivre.

**Outils**
- Prêts bancaires et **Calculatrice** : un simulateur d'intérêts composés indépendant du budget, avec capital de départ, investissement mensuel régulier, taux annuel et durée — pour estimer la valeur future d'une épargne programmée. Ce calcul est fourni à titre indicatif et ne remplace pas un conseil financier.

**Comptes et confidentialité**
- Plusieurs comptes locaux sur le même ordinateur, chacun avec son propre budget et un code secret (PIN).
- Écran de sélection des comptes avec photo de profil, pseudonyme personnalisable, et création/suppression de comptes depuis un écran dédié.
- Session invité pour parcourir l'application avec un budget d'exemple, sans rien enregistrer.
- Changement de compte sans fermer l'application.
- Interface disponible en français et en anglais.

**Apparence et personnalisation**
- La même interface que toute la famille Nebula (Nebula Hub, Clock, News) : fenêtre sans cadre aux boutons Windows teintés selon le thème, barre latérale flottante rangée en groupes (« Mon budget », « Outils »), carte d'état Nebula Hub, colonne de contenu centrée qui s'élargit sur les grands écrans et les écrans ultra-larges, rail d'icônes sur les fenêtres étroites.
- Thèmes de la famille : **Nebula sombre**, **Nebula clair**, **Verre sombre**, **Verre clair** (surfaces translucides et floutées, avec un reflet qui suit la souris) et **Système** (par défaut, suit Windows). Les **thèmes historiques** Old sombre et Old clair (les anciens thèmes émeraude/or) restent disponibles, tels quels.
- Couleurs d'accent : six palettes prêtes à l'emploi (Nebula, Aurore, Océan, Couchant, Sakura, Braise) ou deux couleurs entièrement personnalisées. Tout suit : boutons, navigation, graphiques et arrière-plans.
- Arrière-plans animés : halo nébuleuse, aurore boréale, champ d'étoiles (avec étoiles filantes), constellation qui réagit à la souris, vagues — ou aucun.
- Animations de l'interface réglables : complètes (transitions d'écran, ondulation au clic), réduites ou désactivées.
- Petits sons d'interface (clic, ajout, suppression, erreur, connexion), générés par l'application elle-même, avec réglage du volume — désactivables à tout moment.
- Nouveau jeu d'icônes dessiné pour l'application, qui prend la couleur du thème.

**Sauvegarde et copie**
- Export de votre budget dans un fichier de sauvegarde unique, à tout moment. L'export est proposé dans `Documents\Nebula Finterest`, le **dossier racine** des sauvegardes : c'est là que l'application regarde en premier pour un import.
- Import d'une sauvegarde pour restaurer vos données, y compris sur un autre ordinateur, toujours après confirmation. Les sauvegardes faites par toutes les versions précédentes restent importables, y compris le fichier créé automatiquement à la désinstallation ; quand une sauvegarde contient plusieurs profils, vous choisissez lequel importer.
- **Après une réinstallation**, le premier profil créé se voit proposer la sauvegarde la plus récente du dossier racine.
- **Dossier de copie** : choisissez un second dossier (clé USB, OneDrive, NAS…) dans les réglages. Chaque profil y est recopié automatiquement à chaque modification. C'est une **simple copie** : les profils de cet ordinateur (et leurs codes) restent la référence et ne sont jamais remplacés par ce dossier. Les profils présents dans la copie mais absents de cet ordinateur sont listés dans les réglages, et ajoutés seulement si vous le demandez. Supprimer un profil ne l'efface pas de la copie. Les données y sont copiées sans chiffrement : choisissez un emplacement de confiance. La session invité n'est jamais copiée.
- Sur Windows, la désinstallation sauvegarde automatiquement vos comptes dans `Documents\Nebula Finterest` avant de les supprimer (une sauvegarde précédente du même nom est conservée, renommée avec sa date). Si cette sauvegarde échoue, l'installeur vous demande si vous voulez continuer, au lieu de rester bloqué.

**Nebula Hub (facultatif)**
- Nebula Finterest fonctionne seule, comme toujours. Si [Nebula Hub](https://github.com/Memel-SQT/Nebula-Hub) est installé, elle peut :
  - suivre l'apparence Nebula (thème, couleurs, fond, animations, sons, langue), sauf les thèmes « Ancien », qui restent un choix local ;
  - afficher votre **reste à vivre** sur l'accueil du Hub (masqué par défaut) et vous prévenir **la veille d'un prélèvement**, uniquement avec votre accord donné dans le Hub, et jamais quand l'application est verrouillée ;
  - s'ouvrir **dans la fenêtre du Hub** plutôt que dans la sienne (bouton « Détacher » pour revenir) ;
  - laisser le Hub installer ses mises à jour, si vous l'activez dans les réglages.
  - afficher, sur la vue d'ensemble, une carte **« Apprendre »** avec les articles de finance du jour de [Nebula News](https://github.com/Memel-SQT/Nebula-News) (éducation financière), si News est installée. Un clic ouvre le thème « Finance » dans News. La demande ne contient **rien** de votre budget, la carte apparaît avec un profil déverrouillé comme en session invité, apparaît d'elle-même dès que News répond (nouvel essai toutes les 30 secondes tant qu'elle ne répond pas, par exemple au démarrage), puis se rafraîchit au plus tous les quarts d'heure, et se désactive dans Réglages → Nebula Hub (« Articles de finance de Nebula News »).
  - un onglet **« Nebula News »** (groupe Outils, quand Nebula Hub est là) : les derniers articles de finance de Nebula News (jusqu'à 20, avec leur source, leur date et un court résumé). La liste apparaît d'elle-même dès que News répond ; un clic ouvre l'article dans Nebula News. Le même réglage « Articles de finance de Nebula News » la désactive.
- La carte « Nebula Hub » en bas de la barre latérale indique s'il est connecté et l'ouvre d'un clic.
- L'échange avec le Hub passe par Nebula Link, une liaison **locale** entre applications de l'ordinateur : aucun appel réseau, rien ne quitte votre ordinateur.

**Mises à jour**
- Vérification automatique des mises à jour au démarrage (Windows), et bouton de vérification manuelle dans les réglages.

## Installation

### Windows
Téléchargez le dernier installeur (`Nebula-Finterest-Setup-x.x.x.exe`) depuis les [Releases](../../releases) du dépôt, puis lancez-le. Nebula Finterest s'installe pour votre utilisateur, sans droits administrateur.

Si vous aviez déjà installé Finterest, la mise à jour se fait normalement : l'application est simplement renommée, et **vos comptes et budgets sont conservés**.

### macOS et Linux
Des versions macOS (`.dmg`) et Linux (`AppImage`) sont **prévues** mais **pas encore disponibles** — ce n'est pas la priorité actuelle du projet. Windows reste la seule plateforme activement distribuée pour le moment.

## Utilisation

1. Au premier lancement, créez un compte local avec un nom et un code secret à 4-8 chiffres — ou cliquez sur « Essayer sans compte » pour faire un tour sans rien enregistrer.
2. Renseignez votre revenu mensuel, ajoutez vos abonnements/prélèvements, vos achats prévus et vos éventuels prêts.
3. Consultez la vue d'ensemble pour voir votre reste à vivre du mois.
4. Depuis les réglages, personnalisez l'apparence (thème, couleurs, arrière-plan, animations, sons, langue), exportez une sauvegarde ou choisissez un dossier de copie, réglez l'intégration à Nebula Hub, et vérifiez les mises à jour disponibles.
5. Depuis l'écran de sélection des comptes, créez ou supprimez des comptes locaux, ou changez de compte à tout moment depuis votre profil.

## Vos données

Votre budget est stocké uniquement sur votre ordinateur, dans le dossier de données de l'application (et dans le dossier de copie si vous en avez choisi un). Aucune information n'est envoyée à un tiers, et l'application ne fait aucun appel réseau pour vos données : seule la vérification des mises à jour contacte GitHub, et la liaison avec Nebula Hub reste locale. Après plusieurs codes erronés, la saisie du code secret est bloquée 30 secondes. Utilisez régulièrement la fonction d'export pour conserver une copie de sauvegarde de vos données, notamment avant de désinstaller l'application ou de changer d'ordinateur.

## En savoir plus

- [Releases](../../releases) — notes de version de chaque mise à jour (depuis la v0.1.36, elles sont publiées uniquement avec la release).
- [`PATCH_NOTES.md`](PATCH_NOTES.md) — historique des versions jusqu'à la v0.1.35.
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
- `src/electron/` — process principal Electron, pont preload, couche de persistance locale (SQLite via sql.js, écritures atomiques), copie vers le dossier secondaire (`sync.ts`), sauvegardes du dossier racine (`backups.ts`) et intégration à Nebula Hub (`nebula.ts`, SDK `@nebula/link`).
- `src/renderer/` — interface React ; `src/renderer/components/` contient la barre latérale (`Sidebar.tsx`), les écrans (compte, calendrier, prêts, calculatrice, réglages, profil, tableau de bord), le dialogue de confirmation (`Dialog.tsx`), les états vides (`ScreenState.tsx`), le jeu d'icônes Nebula (`Icon.tsx`, porté de `@nebula/design`) et les arrière-plans animés (`BackgroundFx.tsx`) ; `i18n.ts`, `theme.ts`, `appearance.ts` et `sound.ts` gèrent la langue, le thème, la personnalisation et les sons.
- `src/shared/` — types, calculs de budget, budgets / sous-enveloppes / cagnottes (`budgets.ts`), entrées du calendrier, normalisation des sauvegardes et logique de synchronisation, partagés entre les deux processus et testés.
- `tests/electron/` — tests du process principal (anciennes bases, ancien `accounts.json`, copie entre deux machines simulées, sauvegardes).
- `assets/` et `build/` — logo, icônes source, et icône packagée pour Windows/macOS/Linux.

Notes utiles :
- Les jetons de couleur, le dégradé d'accent et l'échelle de mouvement de la DA Nebula sont définis en tête de `src/renderer/styles.css`. Les références sont le dépôt `nebula-design-system` (`tokens/theme.css` fait foi), le paquet `@nebula/design` et le renderer de Nebula Hub, dont la coquille (barre latérale, colonne de contenu, états, dialogues) est portée en fin de `styles.css` ; le guide d'harmonisation de la famille est `docs/PROMPT_DESIGN.md` dans le dépôt Nebula Hub.
- Le nom du produit a changé en v0.1.35, mais l'application épingle volontairement son dossier de données à `%APPDATA%\Finterest` (voir `src/electron/main.ts`) pour ne pas orpheliner les comptes existants.
- Pour tester sans toucher à vos vrais comptes, lancez l'app avec la variable d'environnement `FINTEREST_USER_DATA_DIR` pointant vers un dossier jetable.
- L'application se met à jour automatiquement : toute évolution du schéma SQLite, de `accounts.json` ou du format de sauvegarde doit rester rétrocompatible (migrations additives, nouveaux champs optionnels). Les tests de `tests/electron/` et `src/shared/budget.test.ts` vérifient ce point avec des données au format des anciennes versions.

Le journal technique complet de chaque changement se trouve dans [`DEV_CHANGES.md`](DEV_CHANGES.md).
