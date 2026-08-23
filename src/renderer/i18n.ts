import { useCallback, useEffect, useState } from 'react';

export type Language = 'fr' | 'en';

const STORAGE_KEY = 'finterest-language';

export type TranslationKey =
  | 'app.name' | 'app.tagline'
  | 'mode.simple' | 'mode.advanced' | 'mode.advancedNote'
  | 'nav.overview' | 'nav.calendar' | 'nav.fixed' | 'nav.variable' | 'nav.loans' | 'nav.settings' | 'nav.profile'
  | 'sidebar.localData' | 'sidebar.localDataNote'
  | 'view.overview.eyebrow' | 'view.overview.title'
  | 'view.calendar.eyebrow' | 'view.calendar.title'
  | 'view.fixed.eyebrow' | 'view.fixed.title'
  | 'view.variable.eyebrow' | 'view.variable.title'
  | 'view.loans.eyebrow' | 'view.loans.title'
  | 'view.settings.eyebrow' | 'view.settings.title'
  | 'view.profile.eyebrow' | 'view.profile.title'
  | 'view.advanced.eyebrow' | 'view.advanced.title'
  | 'month.label'
  | 'card.income' | 'card.fixed' | 'card.variable' | 'card.loans' | 'card.remaining'
  | 'insight.status' | 'insight.remainingTitle' | 'insight.percentRemaining' | 'insight.available'
  | 'insight.income' | 'insight.spent' | 'insight.summary' | 'insight.thisMonth'
  | 'insight.totalSpent'
  | 'form.income.title' | 'form.income.label' | 'form.income.saveMonth' | 'form.income.saveIncome'
  | 'form.fixed.title' | 'form.fixed.name' | 'form.fixed.amount' | 'form.fixed.category'
  | 'form.fixed.categoryPlaceholder' | 'form.fixed.dayOfMonth' | 'form.fixed.type'
  | 'form.fixed.type.subscription' | 'form.fixed.type.directDebit' | 'form.fixed.submit'
  | 'form.variable.title' | 'form.variable.name' | 'form.variable.amount' | 'form.variable.category'
  | 'form.variable.date' | 'form.variable.submit'
  | 'form.loan.title' | 'form.loan.name' | 'form.loan.principal' | 'form.loan.monthlyPayment'
  | 'form.loan.rate' | 'form.loan.remainingMonths' | 'form.loan.submit'
  | 'list.fixed.title' | 'list.fixed.subtitle'
  | 'list.variable.title' | 'list.variable.subtitle'
  | 'list.loans.title' | 'list.loans.subtitle'
  | 'list.activate' | 'list.deactivate' | 'list.delete'
  | 'badge.subscription' | 'badge.directDebit'
  | 'category.housing' | 'category.phoneInternet' | 'category.streaming' | 'category.transport'
  | 'category.insurance' | 'category.wellbeing' | 'category.other'
  | 'gate.localSpace' | 'gate.whoUses' | 'gate.chooseAccount' | 'gate.createAnother' | 'gate.manageAccounts'
  | 'gate.welcome' | 'gate.hello' | 'gate.spaceReady' | 'gate.continue' | 'gate.switchAccount'
  | 'gate.createAccount' | 'gate.createIntro' | 'gate.accountName' | 'gate.pinLabel' | 'gate.createAndContinue'
  | 'gate.openExisting' | 'gate.login' | 'gate.loginIntro' | 'gate.account' | 'gate.pinShort' | 'gate.signIn'
  | 'gate.chooseAnother'
  | 'manage.title' | 'manage.intro' | 'manage.delete' | 'manage.deleteConfirmPin' | 'manage.deleteConfirmButton'
  | 'manage.cancel' | 'manage.addAccount' | 'manage.back'
  | 'profile.intro' | 'profile.changePhoto' | 'profile.pseudonym' | 'profile.save' | 'profile.switchAccount'
  | 'settings.title' | 'settings.description' | 'settings.export' | 'settings.import' | 'settings.path'
  | 'settings.loading' | 'settings.language'
  | 'settings.appearance' | 'settings.data' | 'settings.account' | 'settings.theme' | 'settings.viewProfile'
  | 'theme.light' | 'theme.dark' | 'theme.system'
  | 'advanced.title' | 'advanced.heading' | 'advanced.description' | 'advanced.capital' | 'advanced.rate'
  | 'advanced.years' | 'advanced.estimatedValue' | 'advanced.interestOf'
  | 'advanced.monthlyInvestment' | 'advanced.contributedOf'
  | 'calendar.monthlyView' | 'calendar.hint' | 'calendar.prevMonth' | 'calendar.nextMonth'
  | 'calendar.newSubscription' | 'calendar.on' | 'calendar.name' | 'calendar.monthlyPrice'
  | 'calendar.category' | 'calendar.choose' | 'calendar.addOnDate'
  | 'calendar.mon' | 'calendar.tue' | 'calendar.wed' | 'calendar.thu' | 'calendar.fri' | 'calendar.sat' | 'calendar.sun'
  | 'update.available' | 'update.downloaded' | 'update.restartInstall'
  | 'settings.updates' | 'update.check' | 'update.checking' | 'update.notAvailable' | 'update.error'
  | 'error.invalidAccountName' | 'error.invalidPin' | 'error.invalidCredentials' | 'error.accountLocked'
  | 'error.negativeAmount' | 'error.storeNotInitialized' | 'error.invalidBackup'
  | 'error.openAccount' | 'error.loadBudget' | 'error.saveIncome' | 'error.saveMonth'
  | 'error.saveFixed' | 'error.saveVariable' | 'error.saveLoan' | 'error.exportBackup' | 'error.importBackup'
  | 'error.deleteAccount' | 'error.renameAccount' | 'error.setAvatar';

export const fr: Record<TranslationKey, string> = {
  'app.name': 'Finterest',
  'app.tagline': 'Votre budget, simplement',
  'mode.simple': 'Budget simple',
  'mode.advanced': 'Calcul avancé',
  'mode.advancedNote': 'Outils économiques supplémentaires',
  'nav.overview': "Vue d'ensemble",
  'nav.calendar': 'Calendrier',
  'nav.fixed': 'Abonnements / Prélèvements',
  'nav.variable': 'Achats prévus',
  'nav.loans': 'Prêts',
  'nav.settings': 'Sauvegarde',
  'nav.profile': 'Profil',
  'sidebar.localData': 'Données locales',
  'sidebar.localDataNote': 'Enregistrées sur cet ordinateur',
  'view.overview.eyebrow': 'Votre budget',
  'view.overview.title': 'Mon budget du mois',
  'view.calendar.eyebrow': 'Abonnements et échéances',
  'view.calendar.title': 'Calendrier',
  'view.fixed.eyebrow': 'Charges récurrentes',
  'view.fixed.title': 'Mes abonnements et prélèvements',
  'view.variable.eyebrow': 'Achats prévus',
  'view.variable.title': 'Mes achats prévus',
  'view.loans.eyebrow': 'Crédits en cours',
  'view.loans.title': 'Mes prêts bancaires',
  'view.settings.eyebrow': 'Données et sauvegarde',
  'view.settings.title': 'Sauvegarder mes données',
  'view.profile.eyebrow': 'Mon compte',
  'view.profile.title': 'Mon profil',
  'view.advanced.eyebrow': 'Outils économiques',
  'view.advanced.title': 'Calcul avancé',
  'month.label': 'Mois concerné',
  'card.income': 'Revenus du mois',
  'card.fixed': 'Abonnements / Prélèvements',
  'card.variable': 'Achats prévus',
  'card.loans': 'Prêts',
  'card.remaining': 'Reste à vivre',
  'insight.status': 'État du budget',
  'insight.remainingTitle': "Ce qu'il vous reste",
  'insight.percentRemaining': '% restant',
  'insight.available': 'disponible',
  'insight.income': 'Revenus',
  'insight.spent': 'Dépensé',
  'insight.summary': 'En résumé',
  'insight.thisMonth': 'Ce mois-ci',
  'insight.totalSpent': 'Total dépensé',
  'form.income.title': 'Revenus',
  'form.income.label': 'Revenu mensuel',
  'form.income.saveMonth': 'Enregistrer le mois',
  'form.income.saveIncome': 'Enregistrer le revenu',
  'form.fixed.title': 'Nouvel abonnement / prélèvement',
  'form.fixed.name': 'Nom',
  'form.fixed.amount': 'Prix mensuel',
  'form.fixed.category': 'Catégorie',
  'form.fixed.categoryPlaceholder': 'Choisir une catégorie',
  'form.fixed.dayOfMonth': 'Jour de prélèvement',
  'form.fixed.type': 'Type',
  'form.fixed.type.subscription': 'Abonnement',
  'form.fixed.type.directDebit': 'Prélèvement',
  'form.fixed.submit': 'Ajouter',
  'form.variable.title': 'Prévoir un achat',
  'form.variable.name': "Nom de l'achat",
  'form.variable.amount': 'Prix prévu',
  'form.variable.category': 'Catégorie',
  'form.variable.date': 'Date prévue',
  'form.variable.submit': "Ajouter l'achat",
  'form.loan.title': 'Nouveau prêt',
  'form.loan.name': 'Nom du prêt',
  'form.loan.principal': 'Montant emprunté',
  'form.loan.monthlyPayment': 'Mensualité',
  'form.loan.rate': 'Taux annuel (%)',
  'form.loan.remainingMonths': 'Durée restante (mois)',
  'form.loan.submit': 'Ajouter le prêt',
  'list.fixed.title': 'Mes abonnements et prélèvements',
  'list.fixed.subtitle': 'Ce qui tombe chaque mois. Désactivez sans supprimer.',
  'list.variable.title': 'Mes achats prévus',
  'list.variable.subtitle': 'Achats prévus pour {month}.',
  'list.loans.title': 'Mes prêts',
  'list.loans.subtitle': 'Vos crédits en cours et leurs mensualités.',
  'list.activate': 'Activer',
  'list.deactivate': 'Désactiver',
  'list.delete': 'Supprimer',
  'badge.subscription': 'Abonnement',
  'badge.directDebit': 'Prélèvement',
  'category.housing': 'Logement',
  'category.phoneInternet': 'Téléphone et internet',
  'category.streaming': 'Streaming',
  'category.transport': 'Transport',
  'category.insurance': 'Assurance',
  'category.wellbeing': 'Sport et bien-être',
  'category.other': 'Autre',
  'gate.localSpace': 'Espace local',
  'gate.whoUses': 'Qui utilise Finterest ?',
  'gate.chooseAccount': 'Choisissez votre compte pour continuer.',
  'gate.createAnother': 'Créer un autre compte',
  'gate.manageAccounts': 'Gérer les comptes',
  'gate.welcome': 'Bienvenue',
  'gate.hello': 'Bonjour {name}',
  'gate.spaceReady': 'Votre espace budget est prêt. Vous allez être invité à saisir votre code secret.',
  'gate.continue': 'Continuer',
  'gate.switchAccount': 'Changer de compte',
  'gate.createAccount': 'Créer un compte',
  'gate.createIntro': 'Chaque compte possède son propre budget sur cet ordinateur.',
  'gate.accountName': 'Nom du compte',
  'gate.pinLabel': 'Code secret (4 à 8 chiffres)',
  'gate.createAndContinue': 'Créer et continuer',
  'gate.openExisting': 'Ouvrir un compte existant',
  'gate.login': 'Connexion',
  'gate.loginIntro': 'Saisissez votre code secret pour accéder à votre budget.',
  'gate.account': 'Compte',
  'gate.pinShort': 'Code secret',
  'gate.signIn': 'Se connecter',
  'gate.chooseAnother': 'Choisir un autre compte',
  'manage.title': 'Gestion des comptes',
  'manage.intro': 'Créez ou supprimez des comptes locaux sur cet ordinateur.',
  'manage.delete': 'Supprimer',
  'manage.deleteConfirmPin': 'Code secret du compte à supprimer',
  'manage.deleteConfirmButton': 'Confirmer la suppression',
  'manage.cancel': 'Annuler',
  'manage.addAccount': 'Ajouter un compte',
  'manage.back': 'Retour',
  'profile.intro': 'Personnalisez votre profil sur cet ordinateur.',
  'profile.changePhoto': 'Changer la photo',
  'profile.pseudonym': 'Pseudonyme',
  'profile.save': 'Enregistrer',
  'profile.switchAccount': 'Changer de compte',
  'settings.title': 'Données locales',
  'settings.description': 'Finterest conserve votre budget uniquement sur cet ordinateur. Utilisez une sauvegarde pour le transférer.',
  'settings.export': 'Exporter la sauvegarde',
  'settings.import': 'Importer une sauvegarde',
  'settings.path': 'Emplacement : {path}',
  'settings.loading': 'Chargement...',
  'settings.language': 'Langue',
  'settings.appearance': 'Apparence',
  'settings.data': 'Données',
  'settings.account': 'Compte',
  'settings.theme': 'Thème',
  'settings.viewProfile': 'Voir mon profil',
  'theme.light': 'Clair',
  'theme.dark': 'Sombre',
  'theme.system': 'Système',
  'advanced.title': 'Outil économique',
  'advanced.heading': 'Intérêts composés',
  'advanced.description': 'Estimez la valeur future d’une somme placée. Ce calcul ne remplace pas un conseil financier.',
  'advanced.capital': 'Capital de départ',
  'advanced.monthlyInvestment': 'Investissement mensuel',
  'advanced.rate': 'Taux annuel (%)',
  'advanced.years': 'Durée (années)',
  'advanced.estimatedValue': 'Valeur estimée',
  'advanced.contributedOf': 'Dont {amount} versés',
  'advanced.interestOf': 'Dont {amount} d’intérêts',
  'calendar.monthlyView': 'Vue mensuelle',
  'calendar.hint': 'Sélectionnez un jour pour programmer un abonnement ou un prélèvement.',
  'calendar.prevMonth': 'Mois précédent',
  'calendar.nextMonth': 'Mois suivant',
  'calendar.newSubscription': 'Nouvel abonnement / prélèvement',
  'calendar.on': 'Le {day} {month}',
  'calendar.name': 'Nom',
  'calendar.monthlyPrice': 'Prix mensuel',
  'calendar.category': 'Catégorie',
  'calendar.choose': 'Choisir',
  'calendar.addOnDate': 'Ajouter à cette date',
  'calendar.mon': 'Lun', 'calendar.tue': 'Mar', 'calendar.wed': 'Mer', 'calendar.thu': 'Jeu',
  'calendar.fri': 'Ven', 'calendar.sat': 'Sam', 'calendar.sun': 'Dim',
  'update.available': 'Une mise à jour est disponible et se télécharge.',
  'update.downloaded': 'Mise à jour prête à installer.',
  'update.restartInstall': 'Redémarrer et installer',
  'settings.updates': 'Mises à jour',
  'update.check': 'Vérifier les mises à jour',
  'update.checking': 'Vérification en cours...',
  'update.notAvailable': "Vous utilisez la dernière version.",
  'update.error': 'Impossible de vérifier les mises à jour.',
  'error.invalidAccountName': 'Le nom du compte doit contenir au moins 2 caractères.',
  'error.invalidPin': 'Le code doit contenir entre 4 et 8 chiffres.',
  'error.invalidCredentials': 'Nom de compte ou code incorrect.',
  'error.accountLocked': 'Compte verrouillé.',
  'error.negativeAmount': 'Le montant doit être un nombre positif.',
  'error.storeNotInitialized': "Le budget n'est pas encore prêt.",
  'error.invalidBackup': 'Le fichier de sauvegarde est invalide.',
  'error.openAccount': "Impossible d'ouvrir ce compte.",
  'error.loadBudget': 'Impossible de charger le budget.',
  'error.saveIncome': "Impossible d'enregistrer le revenu.",
  'error.saveMonth': "Impossible d'enregistrer le mois.",
  'error.saveFixed': "Impossible d'enregistrer l'abonnement.",
  'error.saveVariable': "Impossible d'enregistrer l'achat.",
  'error.saveLoan': "Impossible d'enregistrer le prêt.",
  'error.exportBackup': "Impossible d'exporter la sauvegarde.",
  'error.importBackup': "Impossible d'importer la sauvegarde.",
  'error.deleteAccount': 'Impossible de supprimer ce compte.',
  'error.renameAccount': 'Impossible de renommer ce compte.',
  'error.setAvatar': "Impossible de changer la photo de profil.",
};

export const en: Record<TranslationKey, string> = {
  'app.name': 'Finterest',
  'app.tagline': 'Your budget, simply',
  'mode.simple': 'Simple budget',
  'mode.advanced': 'Advanced calculator',
  'mode.advancedNote': 'Additional economic tools',
  'nav.overview': 'Overview',
  'nav.calendar': 'Calendar',
  'nav.fixed': 'Subscriptions / Direct debits',
  'nav.variable': 'Planned purchases',
  'nav.loans': 'Loans',
  'nav.settings': 'Backup',
  'nav.profile': 'Profile',
  'sidebar.localData': 'Local data',
  'sidebar.localDataNote': 'Stored on this computer',
  'view.overview.eyebrow': 'Your budget',
  'view.overview.title': 'My monthly budget',
  'view.calendar.eyebrow': 'Subscriptions and due dates',
  'view.calendar.title': 'Calendar',
  'view.fixed.eyebrow': 'Recurring charges',
  'view.fixed.title': 'My subscriptions and direct debits',
  'view.variable.eyebrow': 'Planned purchases',
  'view.variable.title': 'My planned purchases',
  'view.loans.eyebrow': 'Ongoing loans',
  'view.loans.title': 'My bank loans',
  'view.settings.eyebrow': 'Data and backup',
  'view.settings.title': 'Back up my data',
  'view.profile.eyebrow': 'My account',
  'view.profile.title': 'My profile',
  'view.advanced.eyebrow': 'Economic tools',
  'view.advanced.title': 'Advanced calculator',
  'month.label': 'Month',
  'card.income': 'Monthly income',
  'card.fixed': 'Subscriptions / Direct debits',
  'card.variable': 'Planned purchases',
  'card.loans': 'Loans',
  'card.remaining': 'Left to live on',
  'insight.status': 'Budget status',
  'insight.remainingTitle': "What's left",
  'insight.percentRemaining': '% remaining',
  'insight.available': 'available',
  'insight.income': 'Income',
  'insight.spent': 'Spent',
  'insight.summary': 'Summary',
  'insight.thisMonth': 'This month',
  'insight.totalSpent': 'Total spent',
  'form.income.title': 'Income',
  'form.income.label': 'Monthly income',
  'form.income.saveMonth': 'Save month',
  'form.income.saveIncome': 'Save income',
  'form.fixed.title': 'New subscription / direct debit',
  'form.fixed.name': 'Name',
  'form.fixed.amount': 'Monthly price',
  'form.fixed.category': 'Category',
  'form.fixed.categoryPlaceholder': 'Choose a category',
  'form.fixed.dayOfMonth': 'Payment day',
  'form.fixed.type': 'Type',
  'form.fixed.type.subscription': 'Subscription',
  'form.fixed.type.directDebit': 'Direct debit',
  'form.fixed.submit': 'Add',
  'form.variable.title': 'Plan a purchase',
  'form.variable.name': 'Purchase name',
  'form.variable.amount': 'Planned price',
  'form.variable.category': 'Category',
  'form.variable.date': 'Planned date',
  'form.variable.submit': 'Add purchase',
  'form.loan.title': 'New loan',
  'form.loan.name': 'Loan name',
  'form.loan.principal': 'Amount borrowed',
  'form.loan.monthlyPayment': 'Monthly payment',
  'form.loan.rate': 'Annual rate (%)',
  'form.loan.remainingMonths': 'Remaining term (months)',
  'form.loan.submit': 'Add loan',
  'list.fixed.title': 'My subscriptions and direct debits',
  'list.fixed.subtitle': 'What comes out every month. Deactivate without deleting.',
  'list.variable.title': 'My planned purchases',
  'list.variable.subtitle': 'Purchases planned for {month}.',
  'list.loans.title': 'My loans',
  'list.loans.subtitle': 'Your ongoing loans and their monthly payments.',
  'list.activate': 'Activate',
  'list.deactivate': 'Deactivate',
  'list.delete': 'Delete',
  'badge.subscription': 'Subscription',
  'badge.directDebit': 'Direct debit',
  'category.housing': 'Housing',
  'category.phoneInternet': 'Phone and internet',
  'category.streaming': 'Streaming',
  'category.transport': 'Transport',
  'category.insurance': 'Insurance',
  'category.wellbeing': 'Sport and wellbeing',
  'category.other': 'Other',
  'gate.localSpace': 'Local space',
  'gate.whoUses': 'Who is using Finterest?',
  'gate.chooseAccount': 'Choose your account to continue.',
  'gate.createAnother': 'Create another account',
  'gate.manageAccounts': 'Manage accounts',
  'gate.welcome': 'Welcome',
  'gate.hello': 'Hello {name}',
  'gate.spaceReady': 'Your budget space is ready. You will be asked for your PIN next.',
  'gate.continue': 'Continue',
  'gate.switchAccount': 'Switch account',
  'gate.createAccount': 'Create an account',
  'gate.createIntro': 'Each account has its own budget on this computer.',
  'gate.accountName': 'Account name',
  'gate.pinLabel': 'PIN (4 to 8 digits)',
  'gate.createAndContinue': 'Create and continue',
  'gate.openExisting': 'Open an existing account',
  'gate.login': 'Sign in',
  'gate.loginIntro': 'Enter your PIN to access your budget.',
  'gate.account': 'Account',
  'gate.pinShort': 'PIN',
  'gate.signIn': 'Sign in',
  'gate.chooseAnother': 'Choose another account',
  'manage.title': 'Account management',
  'manage.intro': 'Create or delete local accounts on this computer.',
  'manage.delete': 'Delete',
  'manage.deleteConfirmPin': 'PIN of the account to delete',
  'manage.deleteConfirmButton': 'Confirm deletion',
  'manage.cancel': 'Cancel',
  'manage.addAccount': 'Add an account',
  'manage.back': 'Back',
  'profile.intro': 'Customize your profile on this computer.',
  'profile.changePhoto': 'Change photo',
  'profile.pseudonym': 'Nickname',
  'profile.save': 'Save',
  'profile.switchAccount': 'Switch account',
  'settings.title': 'Local data',
  'settings.description': 'Finterest keeps your budget only on this computer. Use a backup to transfer it.',
  'settings.export': 'Export backup',
  'settings.import': 'Import backup',
  'settings.path': 'Location: {path}',
  'settings.loading': 'Loading...',
  'settings.language': 'Language',
  'settings.appearance': 'Appearance',
  'settings.data': 'Data',
  'settings.account': 'Account',
  'settings.theme': 'Theme',
  'settings.viewProfile': 'View my profile',
  'theme.light': 'Light',
  'theme.dark': 'Dark',
  'theme.system': 'System',
  'advanced.title': 'Economic tool',
  'advanced.heading': 'Compound interest',
  'advanced.description': 'Estimate the future value of an invested sum. This calculation does not replace financial advice.',
  'advanced.capital': 'Starting capital',
  'advanced.monthlyInvestment': 'Monthly investment',
  'advanced.rate': 'Annual rate (%)',
  'advanced.years': 'Duration (years)',
  'advanced.estimatedValue': 'Estimated value',
  'advanced.contributedOf': 'Including {amount} contributed',
  'advanced.interestOf': 'Including {amount} in interest',
  'calendar.monthlyView': 'Monthly view',
  'calendar.hint': 'Select a day to schedule a subscription or direct debit.',
  'calendar.prevMonth': 'Previous month',
  'calendar.nextMonth': 'Next month',
  'calendar.newSubscription': 'New subscription / direct debit',
  'calendar.on': 'On {day} {month}',
  'calendar.name': 'Name',
  'calendar.monthlyPrice': 'Monthly price',
  'calendar.category': 'Category',
  'calendar.choose': 'Choose',
  'calendar.addOnDate': 'Add on this date',
  'calendar.mon': 'Mon', 'calendar.tue': 'Tue', 'calendar.wed': 'Wed', 'calendar.thu': 'Thu',
  'calendar.fri': 'Fri', 'calendar.sat': 'Sat', 'calendar.sun': 'Sun',
  'update.available': 'An update is available and downloading.',
  'update.downloaded': 'Update ready to install.',
  'update.restartInstall': 'Restart and install',
  'settings.updates': 'Updates',
  'update.check': 'Check for updates',
  'update.checking': 'Checking...',
  'update.notAvailable': 'You are using the latest version.',
  'update.error': 'Unable to check for updates.',
  'error.invalidAccountName': 'The account name must be at least 2 characters.',
  'error.invalidPin': 'The PIN must be 4 to 8 digits.',
  'error.invalidCredentials': 'Incorrect account name or PIN.',
  'error.accountLocked': 'Account locked.',
  'error.negativeAmount': 'The amount must be a positive number.',
  'error.storeNotInitialized': 'The budget is not ready yet.',
  'error.invalidBackup': 'The backup file is invalid.',
  'error.openAccount': 'Unable to open this account.',
  'error.loadBudget': 'Unable to load the budget.',
  'error.saveIncome': 'Unable to save the income.',
  'error.saveMonth': 'Unable to save the month.',
  'error.saveFixed': 'Unable to save the subscription.',
  'error.saveVariable': 'Unable to save the purchase.',
  'error.saveLoan': 'Unable to save the loan.',
  'error.exportBackup': 'Unable to export the backup.',
  'error.importBackup': 'Unable to import the backup.',
  'error.deleteAccount': 'Unable to delete this account.',
  'error.renameAccount': 'Unable to rename this account.',
  'error.setAvatar': 'Unable to change the profile picture.',
};

const dictionaries: Record<Language, Record<TranslationKey, string>> = { fr, en };

const ERROR_CODE_TO_KEY: Record<string, TranslationKey> = {
  ERR_INVALID_ACCOUNT_NAME: 'error.invalidAccountName',
  ERR_INVALID_PIN: 'error.invalidPin',
  ERR_INVALID_CREDENTIALS: 'error.invalidCredentials',
  ERR_ACCOUNT_LOCKED: 'error.accountLocked',
  ERR_NEGATIVE_AMOUNT: 'error.negativeAmount',
  ERR_STORE_NOT_INITIALIZED: 'error.storeNotInitialized',
  ERR_INVALID_BACKUP: 'error.invalidBackup',
};

export function translate(language: Language, key: TranslationKey, params?: Record<string, string>): string {
  const template = dictionaries[language][key];
  if (!params) {
    return template;
  }
  return Object.entries(params).reduce((text, [name, value]) => text.replace(`{${name}}`, value), template);
}

/** Maps a stable error code thrown by the main process (or one of our own fallback keys) to a translated message. */
export function translateError(language: Language, thrown: unknown, fallback: TranslationKey): string {
  const code = thrown instanceof Error ? thrown.message : '';
  const key = ERROR_CODE_TO_KEY[code] ?? fallback;
  return translate(language, key);
}

export function useLanguage(): [Language, (language: Language) => void] {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === 'en' ? 'en' : 'fr';
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, language);
  }, [language]);

  const setLanguage = useCallback((next: Language) => setLanguageState(next), []);

  return [language, setLanguage];
}
