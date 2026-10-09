import { useCallback, useEffect, useState } from 'react';

export type Language = 'fr' | 'en';

const STORAGE_KEY = 'finterest-language';

export type TranslationKey =
  | 'nav.budgets'
  | 'nav.projects'
  | 'nav.wallets'
  | 'nav.group.plans'
  | 'view.budgets.eyebrow'
  | 'view.budgets.title'
  | 'view.projects.eyebrow'
  | 'view.projects.title'
  | 'view.wallets.eyebrow'
  | 'view.wallets.title'
  | 'budgets.new'
  | 'budgets.newProject'
  | 'budgets.edit'
  | 'budgets.name'
  | 'budgets.namePlaceholder'
  | 'budgets.projectPlaceholder'
  | 'budgets.amount'
  | 'budgets.amountMonthly'
  | 'budgets.period'
  | 'budgets.period.month'
  | 'budgets.period.range'
  | 'budgets.period.open'
  | 'budgets.range'
  | 'budgets.start'
  | 'budgets.end'
  | 'budgets.countsInMonth'
  | 'budgets.countsHint'
  | 'budgets.forecast'
  | 'budgets.inMonth'
  | 'budgets.create'
  | 'budgets.save'
  | 'budgets.cancel'
  | 'budgets.planned'
  | 'budgets.spent'
  | 'budgets.remaining'
  | 'budgets.addExpense'
  | 'budgets.addEnvelope'
  | 'budgets.envelopeName'
  | 'budgets.envelopePlaceholder'
  | 'budgets.envelopeAdd'
  | 'budgets.envelopes'
  | 'budgets.allocated'
  | 'budgets.overAllocated'
  | 'budgets.expenseIn'
  | 'budgets.wholeBudget'
  | 'budgets.expenseAdd'
  | 'budgets.recent'
  | 'budgets.noExpense'
  | 'budgets.more'
  | 'budgets.deleteTitle'
  | 'budgets.deleteKeep'
  | 'budgets.deleteForecast'
  | 'budgets.empty.title'
  | 'budgets.empty.body'
  | 'projects.empty.title'
  | 'projects.empty.body'
  | 'budgets.chargeTo'
  | 'budgets.none'
  | 'wallets.new'
  | 'wallets.name'
  | 'wallets.namePlaceholder'
  | 'wallets.goal'
  | 'wallets.hint'
  | 'wallets.create'
  | 'wallets.balance'
  | 'wallets.goalOf'
  | 'wallets.deposit'
  | 'wallets.withdraw'
  | 'wallets.amount'
  | 'wallets.label'
  | 'wallets.date'
  | 'wallets.add'
  | 'wallets.movements'
  | 'wallets.noMovement'
  | 'wallets.deleteTitle'
  | 'wallets.deleteBody'
  | 'wallets.empty.title'
  | 'wallets.empty.body'
  | 'calendar.budgetStart'
  | 'calendar.budgetEnd'
  | 'error.invalidBudget'
  | 'error.invalidWallet'
  | 'error.saveBudget'
  | 'error.saveWallet'
  | 'learn.eyebrow'
  | 'nav.news'
  | 'view.news.eyebrow'
  | 'view.news.title'
  | 'newsTab.loading'
  | 'newsTab.refresh'
  | 'newsTab.unavailable.title'
  | 'newsTab.unavailable.body'
  | 'newsTab.empty.title'
  | 'newsTab.empty.body'
  | 'newsTab.off.title'
  | 'newsTab.off.body'
  | 'learn.open'
  | 'learn.loading'
  | 'learn.unavailable'
  | 'nebula.newsFinance'
  | 'nebula.newsFinanceHint'
| 'nav.calculator'
| 'nav.group.budget'
| 'nav.group.tools'
| 'nav.sections'
| 'sidebar.hub.title'
  | 'sidebar.hub.connected'
  | 'sidebar.hub.absent'
  | 'sidebar.hub.open'
  | 'sidebar.profile.open'
  | 'sidebar.profile.guest'
  | 'sidebar.profile.lock'
  | 'sidebar.local'
  | 'sidebar.localNote'
  | 'sidebar.version'
  | 'settings.historicThemes'
  | 'empty.fixed.title'
  | 'empty.fixed.body'
  | 'empty.variable.title'
  | 'empty.variable.body'
  | 'empty.loans.title'
  | 'empty.loans.body'
  | 'app.name' | 'app.tagline'
 
  | 'nav.overview' | 'nav.calendar' | 'nav.fixed' | 'nav.variable' | 'nav.loans' | 'nav.settings' | 'nav.profile'
 
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
  | 'list.fixed.title' | 'list.fixed.subtitle' | 'list.fixed.day'
  | 'list.variable.title' | 'list.variable.subtitle'
  | 'list.loans.title' | 'list.loans.subtitle'
  | 'list.activate' | 'list.deactivate' | 'list.delete'
  | 'badge.subscription' | 'badge.directDebit'
  | 'category.housing' | 'category.phoneInternet' | 'category.streaming' | 'category.transport'
  | 'category.insurance' | 'category.wellbeing' | 'category.other'
  | 'gate.localSpace' | 'gate.whoUses' | 'gate.chooseAccount' | 'gate.createAnother' | 'gate.manageAccounts'
  | 'gate.guestMode' | 'gate.guestName' | 'gate.guestIntro'
  | 'gate.welcome' | 'gate.hello' | 'gate.spaceReady' | 'gate.continue' | 'gate.switchAccount'
  | 'gate.createAccount' | 'gate.createIntro' | 'gate.accountName' | 'gate.pinLabel' | 'gate.createAndContinue'
  | 'gate.openExisting' | 'gate.login' | 'gate.loginIntro' | 'gate.account' | 'gate.pinShort' | 'gate.signIn'
  | 'gate.chooseAnother'
  | 'manage.title' | 'manage.intro' | 'manage.delete' | 'manage.deleteConfirmPin' | 'manage.deleteConfirmButton'
  | 'manage.cancel' | 'manage.addAccount' | 'manage.back'
  | 'profile.intro' | 'profile.changePhoto' | 'profile.pseudonym' | 'profile.save' | 'profile.switchAccount'
  | 'profile.guestNotice' | 'profile.exitGuest'
  | 'settings.title' | 'settings.description' | 'settings.export' | 'settings.import' | 'settings.path'
  | 'settings.loading' | 'settings.language'
  | 'settings.appearance' | 'settings.data' | 'settings.account' | 'settings.theme' | 'settings.viewProfile'
  | 'theme.nebulaDark' | 'theme.nebulaLight' | 'theme.oldDark' | 'theme.oldLight' | 'theme.system'
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
  | 'error.deleteAccount' | 'error.renameAccount' | 'error.setAvatar' | 'error.guestReadonly'
  | 'calendar.today'
  | 'calendar.totalRecurring'
  | 'calendar.totalPurchases'
  | 'calendar.totalMonth'
  | 'calendar.entries'
  | 'calendar.selectedDay'
  | 'calendar.close'
  | 'calendar.oneOff'
  | 'calendar.nothingThisDay'
  | 'calendar.entryType'
  | 'calendar.oneOffPurchase'
  | 'calendar.recurring'
  | 'calendar.oneOffNote'
  | 'calendar.recurringNote'
  | 'calendar.pickDay'
  | 'calendar.deleteRecurringConfirm'
  | 'calendar.deleteEveryMonth'
  | 'theme.glassDark'
  | 'theme.glassLight'
  | 'accent.nebula'
  | 'accent.aurora'
  | 'accent.ocean'
  | 'accent.sunset'
  | 'accent.sakura'
  | 'accent.ember'
  | 'accent.custom'
  | 'settings.accent'
  | 'settings.accentPrimary'
  | 'settings.accentSecondary'
  | 'settings.accentLegacyNote'
  | 'settings.effects'
  | 'settings.background'
  | 'background.glow'
  | 'background.aurora'
  | 'background.stars'
  | 'background.particles'
  | 'background.waves'
  | 'background.none'
  | 'settings.motion'
  | 'motion.full'
  | 'motion.reduced'
  | 'motion.off'
  | 'settings.glassHint'
  | 'settings.sounds'
  | 'settings.soundEnabled'
  | 'settings.soundVolume'
  | 'settings.soundTest'
  | 'settings.on'
  | 'settings.off'
  | 'settings.reset'
  | 'sync.title'
  | 'sync.description'
  | 'sync.choose'
  | 'sync.change'
  | 'sync.disable'
  | 'sync.now'
  | 'sync.folder'
  | 'sync.state.disabled'
  | 'sync.state.idle'
  | 'sync.state.syncing'
  | 'sync.state.error'
  | 'sync.lastSync'
  | 'sync.warning'
  | 'sync.guestNote'
  | 'sync.restorable' | 'sync.restore' | 'sync.restoreNote' | 'sync.restored' | 'backup.rootNote' | 'import.pending.title' | 'import.latest.title' | 'import.pending.body' | 'import.latest.body' | 'import.pending.source' | 'import.pending.confirm' | 'import.pending.dismiss' | 'import.pending.locked' | 'import.done' | 'nebula.title' | 'nebula.connected' | 'nebula.offline' | 'nebula.follow' | 'nebula.followHint' | 'nebula.updatesByHub' | 'nebula.updatesByHubHint' | 'nebula.privacy' | 'nebula.apps' | 'nebula.notInstalled' | 'dock.bar' | 'dock.detach'
  | 'error.invalidName'
  | 'error.invalidDate'
  | 'error.invalidMonth'
  | 'error.tooManyAttempts'
  | 'error.syncUnavailable'
  | 'error.sync'
  | 'error.deleteItem'
  | 'error.updateItem';

export const fr: Record<TranslationKey, string> = {
  'nav.budgets': 'Budgets',
  'nav.projects': 'Gros budgets',
  'nav.wallets': 'Cagnottes',
  'nav.group.plans': 'Projets et épargne',
  'view.budgets.eyebrow': 'Enveloppes du quotidien',
  'view.budgets.title': 'Mes budgets',
  'view.projects.eyebrow': 'Voyages et projets',
  'view.projects.title': 'Mes gros budgets',
  'view.wallets.eyebrow': 'Argent mis de côté',
  'view.wallets.title': 'Mes cagnottes',
  'budgets.new': 'Nouveau budget',
  'budgets.newProject': 'Nouveau gros budget',
  'budgets.edit': 'Modifier le budget',
  'budgets.name': 'Nom',
  'budgets.namePlaceholder': 'Courses, loisirs, sorties…',
  'budgets.projectPlaceholder': 'Voyage au Japon, déménagement…',
  'budgets.amount': 'Montant prévu',
  'budgets.amountMonthly': 'Montant par mois',
  'budgets.period': 'Période',
  'budgets.period.month': 'Chaque mois',
  'budgets.period.range': 'Avec des dates',
  'budgets.period.open': 'Sans date',
  'budgets.range': 'Du {start} au {end}',
  'budgets.start': 'Début',
  'budgets.end': 'Fin',
  'budgets.countsInMonth': 'Compter dans le reste à vivre',
  'budgets.countsHint': 'Activé : les dépenses de ce budget diminuent votre reste à vivre. Désactivé : budget prévisionnel, suivi à part.',
  'budgets.forecast': 'Prévisionnel',
  'budgets.inMonth': 'Compte dans le mois',
  'budgets.create': 'Créer le budget',
  'budgets.save': 'Enregistrer',
  'budgets.cancel': 'Annuler',
  'budgets.planned': 'Prévu',
  'budgets.spent': 'Dépensé',
  'budgets.remaining': 'Reste',
  'budgets.addExpense': 'Ajouter une dépense',
  'budgets.addEnvelope': 'Sous-enveloppe',
  'budgets.envelopeName': 'Nom de la sous-enveloppe',
  'budgets.envelopePlaceholder': 'Transport, hébergement…',
  'budgets.envelopeAdd': 'Ajouter la sous-enveloppe',
  'budgets.envelopes': 'Sous-enveloppes',
  'budgets.allocated': '{allocated} répartis sur {amount}',
  'budgets.overAllocated': '{allocated} répartis : plus que le budget ({amount})',
  'budgets.expenseIn': 'Enveloppe',
  'budgets.wholeBudget': 'Budget entier',
  'budgets.expenseAdd': 'Ajouter la dépense',
  'budgets.recent': 'Dernières dépenses',
  'budgets.noExpense': 'Aucune dépense pour le moment.',
  'budgets.more': 'Et {count} de plus dans vos achats prévus.',
  'budgets.deleteTitle': 'Supprimer « {name} » ?',
  'budgets.deleteKeep': 'Ses sous-enveloppes sont supprimées aussi. Ses dépenses restent dans vos achats prévus, sans budget.',
  'budgets.deleteForecast': 'Ses sous-enveloppes et ses dépenses prévisionnelles sont supprimées aussi.',
  'budgets.empty.title': 'Aucun budget pour l’instant',
  'budgets.empty.body': 'Créez un budget (courses, loisirs…), puis ajoutez-y vos dépenses : il se met à jour tout seul.',
  'projects.empty.title': 'Aucun gros budget',
  'projects.empty.body': 'Préparez un voyage ou un projet : un montant, des dates visibles dans le calendrier et des sous-enveloppes (transport, hébergement…).',
  'budgets.chargeTo': 'Budget',
  'budgets.none': 'Aucun budget',
  'wallets.new': 'Nouvelle cagnotte',
  'wallets.name': 'Nom',
  'wallets.namePlaceholder': 'Vacances, coup dur, cadeau…',
  'wallets.goal': 'Objectif (facultatif)',
  'wallets.hint': 'Une cagnotte garde son solde d’un mois à l’autre et ne change pas votre reste à vivre.',
  'wallets.create': 'Créer la cagnotte',
  'wallets.balance': 'Solde',
  'wallets.goalOf': 'Objectif : {goal}',
  'wallets.deposit': 'Versement',
  'wallets.withdraw': 'Retrait',
  'wallets.amount': 'Montant',
  'wallets.label': 'Libellé',
  'wallets.date': 'Date',
  'wallets.add': 'Ajouter',
  'wallets.movements': 'Mouvements',
  'wallets.noMovement': 'Aucun mouvement pour le moment.',
  'wallets.deleteTitle': 'Supprimer la cagnotte « {name} » ?',
  'wallets.deleteBody': 'La cagnotte et ses {count} mouvements seront supprimés.',
  'wallets.empty.title': 'Aucune cagnotte',
  'wallets.empty.body': 'Mettez de l’argent de côté pour un projet ou un imprévu : chaque versement et chaque retrait met le solde à jour.',
  'calendar.budgetStart': 'Début du budget',
  'calendar.budgetEnd': 'Fin du budget',
  'error.invalidBudget': 'Ce budget est introuvable, ou il ne peut pas recevoir de sous-enveloppe.',
  'error.invalidWallet': 'Cette cagnotte est introuvable.',
  'error.saveBudget': 'Impossible d’enregistrer le budget.',
  'error.saveWallet': 'Impossible d’enregistrer la cagnotte.',
  'learn.eyebrow': 'Apprendre',
  'learn.open': 'Lire dans Nebula News',
  'nav.news': 'Nebula News',
  'view.news.eyebrow': 'Nebula News',
  'view.news.title': 'Actus finance',
  'newsTab.loading': 'Chargement des articles',
  'newsTab.refresh': 'Actualiser',
  'newsTab.unavailable.title': 'Nebula News se prépare',
  'newsTab.unavailable.body': 'Les articles de finance apparaîtront ici dès que Nebula News répond. Nebula Finterest réessaie toute seule.',
  'newsTab.empty.title': 'Pas encore d’article de finance',
  'newsTab.empty.body': 'Nebula News n’a encore rien trouvé pour ce thème aujourd’hui. La liste se met à jour toute seule.',
  'newsTab.off.title': 'Articles de Nebula News désactivés',
  'newsTab.off.body': 'Réactivez « Articles de finance de Nebula News » dans Réglages → Nebula Hub pour les voir ici.',
  'learn.loading': 'Chargement des articles de finance…',
  'learn.unavailable': 'Nebula News ne peut pas être ouverte : Nebula Hub doit être installé.',
  'nebula.newsFinance': 'Articles de finance de Nebula News',
  'nebula.newsFinanceHint': 'Une carte « Apprendre » sur la vue d’ensemble, quand Nebula News est installée. Rien de votre budget n’est envoyé.',
  'nav.calculator': 'Calculatrice',
  'nav.group.budget': 'Mon budget',
  'nav.group.tools': 'Outils',
  'nav.sections': 'Sections de l\'application',
  'sidebar.hub.title': 'Nebula Hub',
  'sidebar.hub.connected': 'Connecté',
  'sidebar.hub.absent': 'Absent',
  'sidebar.hub.open': 'ouvrir les apps Nebula',
  'sidebar.profile.open': 'Profil ouvert',
  'sidebar.profile.guest': 'Session invité',
  'sidebar.profile.lock': 'Verrouiller et changer de profil',
  'sidebar.local': 'Local, sans compte',
  'sidebar.localNote': 'Vos données restent sur cet ordinateur.',
  'sidebar.version': 'Version {version}',
  'settings.historicThemes': 'Thèmes historiques',
  'empty.fixed.title': 'Aucun abonnement pour l’instant',
  'empty.fixed.body': 'Ajoutez votre premier abonnement ou prélèvement avec le formulaire.',
  'empty.variable.title': 'Aucun achat prévu ce mois-ci',
  'empty.variable.body': 'Ajoutez un achat avec le formulaire, ou depuis un jour du calendrier.',
  'empty.loans.title': 'Aucun prêt en cours',
  'empty.loans.body': 'Ajoutez un prêt pour compter ses mensualités dans votre reste à vivre.',
  'app.name': 'Nebula Finterest',
  'app.tagline': 'Votre budget, simplement',
  'nav.overview': "Vue d'ensemble",
  'nav.calendar': 'Calendrier',
  'nav.fixed': 'Abonnements',
  'nav.variable': 'Achats prévus',
  'nav.loans': 'Prêts',
  'nav.settings': 'Réglages',
  'nav.profile': 'Profil',
  'view.overview.eyebrow': 'Votre budget',
  'view.overview.title': 'Mon budget du mois',
  'view.calendar.eyebrow': 'Échéances et achats prévus',
  'view.calendar.title': 'Calendrier',
  'view.fixed.eyebrow': 'Charges récurrentes',
  'view.fixed.title': 'Mes abonnements et prélèvements',
  'view.variable.eyebrow': 'Achats prévus',
  'view.variable.title': 'Mes achats prévus',
  'view.loans.eyebrow': 'Crédits en cours',
  'view.loans.title': 'Mes prêts bancaires',
  'view.settings.eyebrow': 'Apparence, sons et données',
  'view.settings.title': 'Réglages',
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
  'list.fixed.day': 'le {day} du mois',
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
  'gate.whoUses': 'Qui utilise Nebula Finterest ?',
  'gate.chooseAccount': 'Choisissez votre compte pour continuer.',
  'gate.createAnother': 'Créer un autre compte',
  'gate.manageAccounts': 'Gérer les comptes',
  'gate.guestMode': 'Essayer sans compte',
  'gate.guestName': 'Invité',
  'gate.guestIntro': 'Parcourez Nebula Finterest avec des données d’exemple. Rien de ce que vous saisissez ne sera enregistré.',
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
  'profile.guestNotice': 'Session invité : vos modifications ne sont pas enregistrées et disparaîtront à la fermeture.',
  'profile.exitGuest': 'Quitter le mode invité',
  'settings.title': 'Réglages',
  'settings.description': 'Personnalisez Nebula Finterest et gérez vos données, qui restent sur cet ordinateur (et, si vous le souhaitez, dans un dossier de synchronisation).',
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
  'theme.nebulaDark': 'Nebula sombre',
  'theme.nebulaLight': 'Nebula clair',
  'theme.oldDark': 'Old sombre',
  'theme.oldLight': 'Old clair',
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
  'calendar.hint': 'Vos abonnements, prélèvements et achats prévus, jour par jour.',
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
  'error.guestReadonly': "Impossible en mode invité : rien n'est enregistré durant cette session.",
  'calendar.today': 'Aujourd\'hui',
  'calendar.totalRecurring': 'Récurrent',
  'calendar.totalPurchases': 'Achats ponctuels',
  'calendar.totalMonth': 'Total du mois',
  'calendar.entries': 'élément(s)',
  'calendar.selectedDay': 'Jour sélectionné',
  'calendar.close': 'Fermer',
  'calendar.oneOff': 'Achat ponctuel',
  'calendar.nothingThisDay': 'Rien de prévu ce jour-là pour le moment.',
  'calendar.entryType': 'Type d\'élément',
  'calendar.oneOffPurchase': 'Achat ponctuel',
  'calendar.recurring': 'Abonnement / prélèvement',
  'calendar.oneOffNote': 'Compté une seule fois, uniquement ce mois-ci.',
  'calendar.recurringNote': 'Revient chaque mois à cette date.',
  'calendar.pickDay': 'Sélectionnez un jour pour voir ce qui y est prévu, ou y ajouter un achat ponctuel ou un abonnement.',
  'calendar.deleteRecurringConfirm': 'Supprime cet abonnement de tous les mois',
  'calendar.deleteEveryMonth': 'Supprimer partout ?',
  'theme.glassDark': 'Verre sombre',
  'theme.glassLight': 'Verre clair',
  'accent.nebula': 'Nebula',
  'accent.aurora': 'Aurore',
  'accent.ocean': 'Océan',
  'accent.sunset': 'Couchant',
  'accent.sakura': 'Sakura',
  'accent.ember': 'Braise',
  'accent.custom': 'Personnalisée',
  'settings.accent': 'Couleurs d\'accent',
  'settings.accentPrimary': 'Couleur principale',
  'settings.accentSecondary': 'Couleur secondaire',
  'settings.accentLegacyNote': 'Les thèmes « Old » gardent leurs couleurs d’origine.',
  'settings.effects': 'Effets et animations',
  'settings.background': 'Arrière-plan animé',
  'background.glow': 'Halo nébuleuse',
  'background.aurora': 'Aurore boréale',
  'background.stars': 'Champ d’étoiles',
  'background.particles': 'Constellation',
  'background.waves': 'Vagues',
  'background.none': 'Aucun',
  'settings.motion': 'Animations de l’interface',
  'motion.full': 'Complètes',
  'motion.reduced': 'Réduites',
  'motion.off': 'Désactivées',
  'settings.glassHint': 'Astuce : les thèmes Verre sont à leur meilleur avec l’arrière-plan « Aurore boréale ».',
  'settings.sounds': 'Sons',
  'settings.soundEnabled': 'Sons de l\'interface',
  'settings.soundVolume': 'Volume',
  'settings.soundTest': 'Tester',
  'settings.on': 'Activés',
  'settings.off': 'Désactivés',
  'settings.reset': 'Réinitialiser l’apparence',
  'sync.title': 'Copie de sauvegarde',
  'sync.description': 'Choisissez un second dossier (clé USB, OneDrive, NAS…) : chaque profil de cet ordinateur y est recopié à chaque modification. C’est une simple copie : les profils de cet ordinateur restent la référence et ne sont jamais remplacés par ce dossier. Supprimer un profil ici ne l’efface pas de la copie.',
  'sync.choose': 'Choisir un dossier',
  'sync.change': 'Changer de dossier',
  'sync.disable': 'Désactiver',
  'sync.now': 'Copier maintenant',
  'sync.folder': 'Dossier : {path}',
  'sync.state.disabled': 'Copie désactivée.',
  'sync.state.idle': 'Copie à jour.',
  'sync.state.syncing': 'Copie en cours…',
  'sync.state.error': 'Le dossier de copie est inaccessible : vos données restent enregistrées sur cet ordinateur.',
  'sync.lastSync': 'Dernière copie : {time}',
  'sync.warning': 'Les données y sont copiées sans chiffrement : choisissez un emplacement de confiance.',
  'sync.guestNote': 'La session invité n’est jamais copiée.',
  'sync.restorable': 'Profils présents dans le dossier de copie mais pas sur cet ordinateur :',
  'sync.restore': 'Ajouter {name} sur cet ordinateur',
  'sync.restoreNote': 'Le profil est ajouté avec son code PIN d’origine. Rien de ce qui est déjà sur cet ordinateur n’est remplacé.',
  'sync.restored': 'Profil ajouté sur cet ordinateur.',
  'backup.rootNote': 'Les sauvegardes sont proposées dans Documents\\Nebula Finterest : c’est le dossier que l’app consulte en premier pour un import.',
  'import.pending.title': 'Importer une sauvegarde ?',
  'import.latest.title': 'Une sauvegarde a été trouvée',
  'import.pending.body': '« {file} » ({date}). Ses données remplaceront celles du profil {name}.',
  'import.latest.body': 'Ce profil vient d’être créé. Voulez-vous y importer « {file} » ({date}), trouvée dans Documents\\Nebula Finterest ?',
  'import.pending.source': 'Profil à importer depuis la sauvegarde',
  'import.pending.confirm': 'Importer',
  'import.pending.dismiss': 'Ignorer',
  'import.pending.locked': 'Une sauvegarde attend d’être importée : ouvrez le profil qui doit la recevoir.',
  'import.done': 'Sauvegarde importée.',
  'nebula.title': 'Nebula Hub',
  'nebula.connected': 'Connectée à Nebula Hub {version}.',
  'nebula.offline': 'Nebula Hub n’est pas ouvert : Nebula Finterest fonctionne seule, comme toujours.',
  'nebula.follow': 'Suivre l’apparence Nebula',
  'nebula.followHint': 'Thème, couleurs, fond, animations, sons et langue réglés dans Nebula Hub s’appliquent ici. Les thèmes « Ancien » restent un choix local.',
  'nebula.updatesByHub': 'Mises à jour gérées par Nebula Hub',
  'nebula.updatesByHubHint': 'Quand le Hub est ouvert, c’est lui qui installe les mises à jour, après une sauvegarde vérifiée. Sans le Hub, Nebula Finterest se met à jour seule.',
  'nebula.privacy': 'Avec votre accord donné dans le Hub, Nebula Finterest peut y afficher votre reste à vivre (masqué par défaut) et vous prévenir la veille d’un prélèvement. Rien n’est partagé tant que l’app est verrouillée.',
  'nebula.apps': 'Apps Nebula',
  'nebula.notInstalled': 'Nebula Hub n’est pas installé : sa page de téléchargement vient de s’ouvrir.',
  'dock.bar': 'Affichée dans Nebula Hub',
  'dock.detach': 'Détacher',
  'error.invalidName': 'Donnez un nom à cet élément.',
  'error.invalidDate': 'La date est invalide.',
  'error.invalidMonth': 'Le mois est invalide.',
  'error.tooManyAttempts': 'Trop de tentatives. Réessayez dans 30 secondes.',
  'error.syncUnavailable': 'La synchronisation n’est pas configurée.',
  'error.sync': 'Impossible de synchroniser.',
  'error.deleteItem': 'Impossible de supprimer cet élément.',
  'error.updateItem': 'Impossible de modifier cet élément.',
};

export const en: Record<TranslationKey, string> = {
  'nav.budgets': 'Budgets',
  'nav.projects': 'Big budgets',
  'nav.wallets': 'Pots',
  'nav.group.plans': 'Projects and savings',
  'view.budgets.eyebrow': 'Everyday envelopes',
  'view.budgets.title': 'My budgets',
  'view.projects.eyebrow': 'Trips and projects',
  'view.projects.title': 'My big budgets',
  'view.wallets.eyebrow': 'Money set aside',
  'view.wallets.title': 'My pots',
  'budgets.new': 'New budget',
  'budgets.newProject': 'New big budget',
  'budgets.edit': 'Edit the budget',
  'budgets.name': 'Name',
  'budgets.namePlaceholder': 'Groceries, leisure, outings…',
  'budgets.projectPlaceholder': 'Trip to Japan, moving house…',
  'budgets.amount': 'Planned amount',
  'budgets.amountMonthly': 'Amount per month',
  'budgets.period': 'Period',
  'budgets.period.month': 'Every month',
  'budgets.period.range': 'With dates',
  'budgets.period.open': 'No dates',
  'budgets.range': 'From {start} to {end}',
  'budgets.start': 'Start',
  'budgets.end': 'End',
  'budgets.countsInMonth': 'Count in what is left this month',
  'budgets.countsHint': 'On: this budget’s expenses lower what is left this month. Off: a forecast budget, tracked apart.',
  'budgets.forecast': 'Forecast',
  'budgets.inMonth': 'Counts in the month',
  'budgets.create': 'Create the budget',
  'budgets.save': 'Save',
  'budgets.cancel': 'Cancel',
  'budgets.planned': 'Planned',
  'budgets.spent': 'Spent',
  'budgets.remaining': 'Left',
  'budgets.addExpense': 'Add an expense',
  'budgets.addEnvelope': 'Sub-envelope',
  'budgets.envelopeName': 'Sub-envelope name',
  'budgets.envelopePlaceholder': 'Travel, lodging…',
  'budgets.envelopeAdd': 'Add the sub-envelope',
  'budgets.envelopes': 'Sub-envelopes',
  'budgets.allocated': '{allocated} shared out of {amount}',
  'budgets.overAllocated': '{allocated} shared out: more than the budget ({amount})',
  'budgets.expenseIn': 'Envelope',
  'budgets.wholeBudget': 'Whole budget',
  'budgets.expenseAdd': 'Add the expense',
  'budgets.recent': 'Latest expenses',
  'budgets.noExpense': 'No expense yet.',
  'budgets.more': 'And {count} more in your planned purchases.',
  'budgets.deleteTitle': 'Delete “{name}”?',
  'budgets.deleteKeep': 'Its sub-envelopes are deleted too. Its expenses stay in your planned purchases, without a budget.',
  'budgets.deleteForecast': 'Its sub-envelopes and its forecast expenses are deleted too.',
  'budgets.empty.title': 'No budget yet',
  'budgets.empty.body': 'Create a budget (groceries, leisure…), then add your expenses to it: it updates itself.',
  'projects.empty.title': 'No big budget yet',
  'projects.empty.body': 'Plan a trip or a project: an amount, dates shown in the calendar and sub-envelopes (travel, lodging…).',
  'budgets.chargeTo': 'Budget',
  'budgets.none': 'No budget',
  'wallets.new': 'New pot',
  'wallets.name': 'Name',
  'wallets.namePlaceholder': 'Holidays, rainy day, gift…',
  'wallets.goal': 'Goal (optional)',
  'wallets.hint': 'A pot keeps its balance from month to month and does not change what is left this month.',
  'wallets.create': 'Create the pot',
  'wallets.balance': 'Balance',
  'wallets.goalOf': 'Goal: {goal}',
  'wallets.deposit': 'Deposit',
  'wallets.withdraw': 'Withdrawal',
  'wallets.amount': 'Amount',
  'wallets.label': 'Label',
  'wallets.date': 'Date',
  'wallets.add': 'Add',
  'wallets.movements': 'Movements',
  'wallets.noMovement': 'No movement yet.',
  'wallets.deleteTitle': 'Delete the pot “{name}”?',
  'wallets.deleteBody': 'The pot and its {count} movements will be deleted.',
  'wallets.empty.title': 'No pot yet',
  'wallets.empty.body': 'Set money aside for a project or a rainy day: every deposit and withdrawal updates the balance.',
  'calendar.budgetStart': 'Budget starts',
  'calendar.budgetEnd': 'Budget ends',
  'error.invalidBudget': 'This budget cannot be found, or it cannot hold a sub-envelope.',
  'error.invalidWallet': 'This pot cannot be found.',
  'error.saveBudget': 'Could not save the budget.',
  'error.saveWallet': 'Could not save the pot.',
  'learn.eyebrow': 'Learn',
  'learn.open': 'Read in Nebula News',
  'nav.news': 'Nebula News',
  'view.news.eyebrow': 'Nebula News',
  'view.news.title': 'Finance news',
  'newsTab.loading': 'Loading the articles',
  'newsTab.refresh': 'Refresh',
  'newsTab.unavailable.title': 'Nebula News is getting ready',
  'newsTab.unavailable.body': 'The finance articles show up here as soon as Nebula News answers. Nebula Finterest keeps trying on its own.',
  'newsTab.empty.title': 'No finance article yet',
  'newsTab.empty.body': 'Nebula News has not found anything for this theme today. The list updates on its own.',
  'newsTab.off.title': 'Nebula News articles are off',
  'newsTab.off.body': 'Turn “Finance articles from Nebula News” back on in Settings → Nebula Hub to see them here.',
  'learn.loading': 'Loading the finance articles…',
  'learn.unavailable': 'Nebula News cannot be opened: Nebula Hub must be installed.',
  'nebula.newsFinance': 'Finance articles from Nebula News',
  'nebula.newsFinanceHint': 'A “Learn” card on the overview, when Nebula News is installed. Nothing from your budget is sent.',
  'nav.calculator': 'Calculator',
  'nav.group.budget': 'My budget',
  'nav.group.tools': 'Tools',
  'nav.sections': 'App sections',
  'sidebar.hub.title': 'Nebula Hub',
  'sidebar.hub.connected': 'Connected',
  'sidebar.hub.absent': 'Not running',
  'sidebar.hub.open': 'open the Nebula apps',
  'sidebar.profile.open': 'Open profile',
  'sidebar.profile.guest': 'Guest session',
  'sidebar.profile.lock': 'Lock and switch profile',
  'sidebar.local': 'Local, no account',
  'sidebar.localNote': 'Your data stays on this computer.',
  'sidebar.version': 'Version {version}',
  'settings.historicThemes': 'Historic themes',
  'empty.fixed.title': 'No subscriptions yet',
  'empty.fixed.body': 'Add your first subscription or direct debit with the form.',
  'empty.variable.title': 'No purchases planned this month',
  'empty.variable.body': 'Add a purchase with the form, or from a day of the calendar.',
  'empty.loans.title': 'No loans yet',
  'empty.loans.body': 'Add a loan to count its payments in what you have left.',
  'app.name': 'Nebula Finterest',
  'app.tagline': 'Your budget, simply',
  'nav.overview': 'Overview',
  'nav.calendar': 'Calendar',
  'nav.fixed': 'Subscriptions',
  'nav.variable': 'Planned purchases',
  'nav.loans': 'Loans',
  'nav.settings': 'Settings',
  'nav.profile': 'Profile',
  'view.overview.eyebrow': 'Your budget',
  'view.overview.title': 'My monthly budget',
  'view.calendar.eyebrow': 'Due dates and planned purchases',
  'view.calendar.title': 'Calendar',
  'view.fixed.eyebrow': 'Recurring charges',
  'view.fixed.title': 'My subscriptions and direct debits',
  'view.variable.eyebrow': 'Planned purchases',
  'view.variable.title': 'My planned purchases',
  'view.loans.eyebrow': 'Ongoing loans',
  'view.loans.title': 'My bank loans',
  'view.settings.eyebrow': 'Appearance, sounds and data',
  'view.settings.title': 'Settings',
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
  'list.fixed.day': 'on day {day}',
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
  'gate.whoUses': 'Who is using Nebula Finterest?',
  'gate.chooseAccount': 'Choose your account to continue.',
  'gate.createAnother': 'Create another account',
  'gate.manageAccounts': 'Manage accounts',
  'gate.guestMode': 'Try without an account',
  'gate.guestName': 'Guest',
  'gate.guestIntro': "Browse Nebula Finterest with sample data. Nothing you enter will be saved.",
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
  'profile.guestNotice': "Guest session: your changes are not saved and will disappear when you close the app.",
  'profile.exitGuest': 'Exit guest mode',
  'settings.title': 'Settings',
  'settings.description': 'Customize Nebula Finterest and manage your data, which stays on this computer (and, if you want, in a sync folder).',
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
  'theme.nebulaDark': 'Nebula dark',
  'theme.nebulaLight': 'Nebula light',
  'theme.oldDark': 'Old dark',
  'theme.oldLight': 'Old light',
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
  'calendar.hint': 'Your subscriptions, direct debits and planned purchases, day by day.',
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
  'error.guestReadonly': "Not available in guest mode: nothing is saved during this session.",
  'calendar.today': 'Today',
  'calendar.totalRecurring': 'Recurring',
  'calendar.totalPurchases': 'One-off purchases',
  'calendar.totalMonth': 'Month total',
  'calendar.entries': 'item(s)',
  'calendar.selectedDay': 'Selected day',
  'calendar.close': 'Close',
  'calendar.oneOff': 'One-off purchase',
  'calendar.nothingThisDay': 'Nothing planned on this day yet.',
  'calendar.entryType': 'Item type',
  'calendar.oneOffPurchase': 'One-off purchase',
  'calendar.recurring': 'Subscription / debit',
  'calendar.oneOffNote': 'Counted once, in this month only.',
  'calendar.recurringNote': 'Comes back every month on this date.',
  'calendar.pickDay': 'Select a day to see what is planned, or add a one-off purchase or a subscription to it.',
  'calendar.deleteRecurringConfirm': 'Removes this subscription from every month',
  'calendar.deleteEveryMonth': 'Delete everywhere?',
  'theme.glassDark': 'Glass dark',
  'theme.glassLight': 'Glass light',
  'accent.nebula': 'Nebula',
  'accent.aurora': 'Aurora',
  'accent.ocean': 'Ocean',
  'accent.sunset': 'Sunset',
  'accent.sakura': 'Sakura',
  'accent.ember': 'Ember',
  'accent.custom': 'Custom',
  'settings.accent': 'Accent colors',
  'settings.accentPrimary': 'Main color',
  'settings.accentSecondary': 'Secondary color',
  'settings.accentLegacyNote': 'The “Old” themes keep their original colors.',
  'settings.effects': 'Effects and motion',
  'settings.background': 'Animated background',
  'background.glow': 'Nebula glow',
  'background.aurora': 'Aurora',
  'background.stars': 'Starfield',
  'background.particles': 'Constellation',
  'background.waves': 'Waves',
  'background.none': 'None',
  'settings.motion': 'Interface motion',
  'motion.full': 'Full',
  'motion.reduced': 'Reduced',
  'motion.off': 'Off',
  'settings.glassHint': 'Tip: the Glass themes look their best with the “Aurora” background.',
  'settings.sounds': 'Sounds',
  'settings.soundEnabled': 'Interface sounds',
  'settings.soundVolume': 'Volume',
  'settings.soundTest': 'Test',
  'settings.on': 'On',
  'settings.off': 'Off',
  'settings.reset': 'Reset appearance',
  'sync.title': 'Backup copy',
  'sync.description': 'Pick a second folder (USB drive, OneDrive, NAS…): every profile on this computer is copied there on each change. It is a plain copy: the profiles on this computer stay the reference and are never replaced from that folder. Deleting a profile here does not erase it from the copy.',
  'sync.choose': 'Choose a folder',
  'sync.change': 'Change folder',
  'sync.disable': 'Turn off',
  'sync.now': 'Copy now',
  'sync.folder': 'Folder: {path}',
  'sync.state.disabled': 'Copy is off.',
  'sync.state.idle': 'Copy up to date.',
  'sync.state.syncing': 'Copying…',
  'sync.state.error': 'The copy folder cannot be reached: your data is still saved on this computer.',
  'sync.lastSync': 'Last copy: {time}',
  'sync.warning': 'Data is copied there unencrypted: choose a location you trust.',
  'sync.guestNote': 'The guest session is never copied.',
  'sync.restorable': 'Profiles in the copy folder but not on this computer:',
  'sync.restore': 'Add {name} to this computer',
  'sync.restoreNote': 'The profile is added with its original PIN. Nothing already on this computer is replaced.',
  'sync.restored': 'Profile added to this computer.',
  'backup.rootNote': 'Backups are suggested in Documents\\Nebula Finterest: the folder the app looks in first for an import.',
  'import.pending.title': 'Import a backup?',
  'import.latest.title': 'A backup was found',
  'import.pending.body': '“{file}” ({date}). Its data will replace the data of the profile {name}.',
  'import.latest.body': 'This profile was just created. Import into it “{file}” ({date}), found in Documents\\Nebula Finterest?',
  'import.pending.source': 'Profile to import from the backup',
  'import.pending.confirm': 'Import',
  'import.pending.dismiss': 'Ignore',
  'import.pending.locked': 'A backup is waiting to be imported: open the profile that should receive it.',
  'import.done': 'Backup imported.',
  'nebula.title': 'Nebula Hub',
  'nebula.connected': 'Connected to Nebula Hub {version}.',
  'nebula.offline': 'Nebula Hub is not open: Nebula Finterest works on its own, as always.',
  'nebula.follow': 'Follow the Nebula appearance',
  'nebula.followHint': 'Theme, colors, background, motion, sounds and language set in Nebula Hub apply here. The “Old” themes stay a local choice.',
  'nebula.updatesByHub': 'Updates handled by Nebula Hub',
  'nebula.updatesByHubHint': 'While the Hub is open, it installs the updates, after a checked backup. Without the Hub, Nebula Finterest updates itself.',
  'nebula.privacy': 'With your consent given in the Hub, Nebula Finterest can show your budget left there (hidden by default) and warn you the day before a direct debit. Nothing is shared while the app is locked.',
  'nebula.apps': 'Nebula apps',
  'nebula.notInstalled': 'Nebula Hub is not installed: its download page just opened.',
  'dock.bar': 'Shown inside Nebula Hub',
  'dock.detach': 'Detach',
  'error.invalidName': 'Give this item a name.',
  'error.invalidDate': 'The date is invalid.',
  'error.invalidMonth': 'The month is invalid.',
  'error.tooManyAttempts': 'Too many attempts. Try again in 30 seconds.',
  'error.syncUnavailable': 'Sync is not set up.',
  'error.sync': 'Could not sync.',
  'error.deleteItem': 'Could not delete this item.',
  'error.updateItem': 'Could not update this item.',
};

const dictionaries: Record<Language, Record<TranslationKey, string>> = { fr, en };

const ERROR_CODE_TO_KEY: Record<string, TranslationKey> = {
  ERR_INVALID_BUDGET: 'error.invalidBudget',
  ERR_INVALID_WALLET: 'error.invalidWallet',
  ERR_INVALID_ACCOUNT_NAME: 'error.invalidAccountName',
  ERR_INVALID_PIN: 'error.invalidPin',
  ERR_INVALID_CREDENTIALS: 'error.invalidCredentials',
  ERR_ACCOUNT_LOCKED: 'error.accountLocked',
  ERR_NEGATIVE_AMOUNT: 'error.negativeAmount',
  ERR_STORE_NOT_INITIALIZED: 'error.storeNotInitialized',
  ERR_INVALID_BACKUP: 'error.invalidBackup',
  ERR_GUEST_READONLY: 'error.guestReadonly',
  ERR_INVALID_NAME: 'error.invalidName',
  ERR_INVALID_DATE: 'error.invalidDate',
  ERR_INVALID_MONTH: 'error.invalidMonth',
  ERR_TOO_MANY_ATTEMPTS: 'error.tooManyAttempts',
  ERR_SYNC_UNAVAILABLE: 'error.syncUnavailable',
};

export function translate(language: Language, key: TranslationKey, params?: Record<string, string>): string {
  const template = dictionaries[language][key] ?? dictionaries.fr[key] ?? key;
  if (!params) {
    return template;
  }
  return Object.entries(params).reduce((text, [name, value]) => text.replace(`{${name}}`, value), template);
}

/** Maps a stable error code thrown by the main process (or one of our own fallback keys) to a translated message. */
export function translateError(language: Language, thrown: unknown, fallback: TranslationKey): string {
  // Errors thrown in the main process reach the renderer wrapped by Electron as
  // "Error invoking remote method 'x': Error: ERR_CODE", so the code is searched for, not compared.
  const message = thrown instanceof Error ? thrown.message : typeof thrown === 'string' ? thrown : '';
  const code = message.match(/ERR_[A-Z_]+/)?.[0] ?? '';
  const key = ERROR_CODE_TO_KEY[code] ?? fallback;
  return translate(language, key);
}

export function useLanguage(): [Language, (language: Language) => void] {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      return window.localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'fr';
    } catch {
      return 'fr';
    }
  });

  useEffect(() => {
    document.documentElement.lang = language;
    try {
      window.localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // Not persisted this session; the choice still applies.
    }
  }, [language]);

  const setLanguage = useCallback((next: Language) => setLanguageState(next), []);

  return [language, setLanguage];
}
