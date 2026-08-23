## Finterest v0.1.28
- Nouveau thème visuel sombre et premium : fonds quasi noirs, accent émeraude, touches dorées discrètes — remplace l'ancien thème cuivré.
- Nouveau logo et nouvelle icône de l'application.
- Personnalisez votre profil : photo et pseudonyme, modifiables depuis un nouvel écran « Profil ».
- Les comptes affichent maintenant leur photo en rond sur l'écran de sélection.
- Nouvel écran dédié pour changer de compte sans fermer l'application (accessible depuis la puce de profil en haut de la barre latérale).
- Le mécanisme de sauvegarde automatique avant désinstallation a été vérifié techniquement contre electron-builder ; un test manuel d'installation/désinstallation reste à faire avant publication.

## Finterest v0.1.27
- Ajout d'une section « Prêts » pour suivre vos crédits bancaires (montant, mensualité, taux, durée restante). Les mensualités actives sont désormais comptées dans votre reste à vivre.
- Les abonnements sont renommés « Abonnements / Prélèvements » : chaque élément a maintenant un type (Abonnement ou Prélèvement) affiché en badge.
- L'application peut maintenant s'afficher en français ou en anglais, au choix, depuis l'écran de connexion ou les réglages.
- Nouvel écran « Gérer les comptes » pour créer ou supprimer des comptes locaux (la suppression demande le code secret du compte concerné).
- Les icônes des catégories d'abonnement n'utilisent plus d'emojis colorés, remplacés par des symboles sobres cohérents avec le reste de l'interface.
- Finterest vérifie désormais automatiquement les mises à jour au démarrage (build Windows) et propose de les installer.
- Sur Windows, la désinstallation sauvegarde désormais automatiquement tous vos comptes locaux dans Documents\Finterest avant de les supprimer.

## Finterest v0.1.26
- L’application s’adapte maintenant mieux aux petites fenêtres.
- Les formulaires, le calendrier et les actions se réorganisent automatiquement.
- La navigation reste accessible sur écran étroit.

## Finterest v0.1.25
- Refonte de l’écran de sélection et de connexion des comptes.
- Nouveau style sombre anthracite avec texte ivoire et accents cuivre.
- Les champs et les choix de compte sont plus lisibles et plus élégants.

## Finterest v0.1.24
- Le désinstalleur Windows est disponible sous `Uninstall Finterest.exe` dans le dossier d’installation.
- L’entrée de désinstallation Windows reste également disponible normalement.

## Finterest v0.1.23
- Ajout de transitions douces entre les pages de l’application.
- Ajout d’un fondu discret sur l’écran des comptes.
- Les animations sont désactivées lorsque le système demande moins de mouvement.

## Finterest v0.1.22
- Vous pouvez maintenant ajouter un abonnement directement depuis le calendrier.
- Sélectionnez un jour, puis renseignez uniquement le nom, le prix et la catégorie.
- Le jour de prélèvement est enregistré automatiquement.
- Le thème visuel a été entièrement harmonisé autour d’une navigation sombre et de surfaces papier plus lisibles.

## Finterest v0.1.21
- La vue calendrier des abonnements est disponible.
- Les abonnements apparaissent sur leur jour de prélèvement.
- Les catégories sont sélectionnables et disposent d’icônes visibles.
- La navigation entre les mois est disponible.

## Finterest v0.1.20
- Ajout d’une vue calendrier mensuelle.
- Les abonnements actifs apparaissent sur leur jour de prélèvement.
- Ajout de catégories prédéfinies avec icônes associées.
- Les icônes apparaissent aussi dans les listes d’abonnements et d’achats.

## Finterest v0.1.19
- Interface visuelle affinée avec des surfaces moins claires et plus chaleureuses.
- Cartes, champs, listes et navigation mieux séparés.
- Le thème sombre secondaire reste disponible.

## Finterest v0.1.18
- Réduit les surfaces trop claires de l’interface.
- Renforcé la lisibilité des cartes, champs et zones de navigation.
- Installeur Windows reconstruit avec cette correction visuelle.

## Finterest v0.1.17
- Réduit la luminosité des cartes, champs, listes, barre latérale et écran de connexion.
- Renforcé les bordures et la profondeur visuelle pour mieux distinguer les zones.
- Aucun changement dans les données ou les fonctionnalités.

## Finterest v0.1.16
- Ajout d’un écran de sélection lorsque plusieurs comptes existent.
- Ajout d’un écran d’accueil personnalisé : « Bonjour [nom] ».
- Ajout d’une page de connexion distincte avec code secret.
- Sidebar réduite et éléments d’interface assombris et harmonisés.
- Installeur Windows reconstruit.

## Finterest v0.1.15
- Ajout de comptes locaux multiples avec code PIN.
- Chaque compte possède son propre budget.
- Ajout d’un écran de sélection et de verrouillage au démarrage.
- L’interface des comptes a été revue pour rester simple et en français.
- Le code PIN n’est pas stocké en clair. Le chiffrement complet des fichiers de base reste à finaliser.

## Finterest v0.1.14
- Le comportement prévu de l’export des comptes est défini : un export complet concernera uniquement le compte actif.
- La sauvegarde devra recréer ce compte et l’intégralité de son budget, sans inclure les autres comptes locaux.
- Aucun changement de données dans cette étape.

## Finterest v0.1.13
- L’interface est maintenant entièrement en français.
- Le mode principal est un calculateur de budget simple : revenu, abonnements mensuels et achats prévus.
- Ajout d’un mode avancé séparé pour estimer les intérêts composés.
- Les montants sont affichés en euros.
- Aucun changement dans les données existantes ni dans les sauvegardes.
- Le nouvel installeur Windows a été reconstruit. Les versions macOS et Linux doivent être générées sur leur système natif (ou avec les privilèges adaptés pour Linux).

## Finterest v0.1.12
- Redesigned the complete interface so the visual theme applies consistently across navigation, dashboard panels, forms, lists, and settings.
- Made the warm light theme primary with a coherent secondary dark theme.
- Improved responsive layouts, keyboard focus visibility, contrast, and reduced-motion behavior.
- No user data or backup changes.

## Finterest v0.1.11
- Added a dedicated Finterest Styling custom agent for renderer layout, visual design, responsive behavior, and accessibility work.
- Documented the current warm light styling direction, preserved dark theme, and the boundary between visual changes and budget functionality.
- No user data or backup changes.

## Finterest v0.1.10
- Cleaned the installer folders so they contain platform packages rather than temporary build directories.
- Added a guide at install/README.txt explaining each distribution folder.
- No user data or backup changes.

## Finterest v0.1.9
- Refreshed the interface with a dark blue/violet Finterest visual identity.
- Added clear navigation between overview, fixed expenses, variable expenses, and settings/backup.
- Added a monthly budget-health visualization and stronger summary hierarchy.
- Added the Finterest monogram to the dashboard and packaged renderer.
- No user data or backup changes.

## Finterest v0.1.8
- Fixed the Windows installer startup error caused by bundling the Electron launcher into the app.
- No user data or backup changes.

## Finterest v0.1.7
- Added dedicated install/windows, install/mac, and install/linux folders.
- Platform build commands now place installers directly in their matching folder.
- No user data or backup changes.

## Finterest v0.1.6
- Added dedicated Windows, macOS, and Linux distribution commands.
- Added automated CI builds for `.exe`, `.dmg`, and `.AppImage` packages.
- No user data or backup changes.

## Finterest v0.1.5
- Windows installer generation now works with a single npm run dist command.
- No manual PowerShell environment variable is required for unsigned development packaging.
- No user data or backup changes.

## Finterest v0.1.4
- Corrected the unsigned Windows installer configuration.
- No user data or backup changes.

## Finterest v0.1.3
- Adjusted unsigned Windows packaging to avoid the code-signing tool extraction step.
- No user data or backup changes.

## Finterest v0.1.2
- Added working lint coverage for the TypeScript source and test files.
- Confirmed the current code passes typecheck, tests, build, and lint.
- Packaging on this Windows shell is still blocked by Electron Builder's winCodeSign symbolic-link extraction step.
- No user-facing data changes were introduced.

## Finterest v0.1.1
- Improved the development workflow so the desktop app now waits for both the Vite server and the rebuilt Electron bundle.
- Fixed shared module path resolution in the renderer build.
- Kept the offline budgeting dashboard and backup/restore flow unchanged.
- No user migration steps are required.

## Finterest v0.1.0
- Added the first working Electron desktop scaffold for Finterest.
- Introduced a budget dashboard that shows monthly income, fixed expenses, variable expenses, total expenses, and remaining income.
- Added local backup export and backup import from a single JSON file.
- Stored application data locally in the user data folder as finterest.sqlite.
- Added the first automated test coverage for the budget summary calculations.
- No migration is required for a fresh install.
