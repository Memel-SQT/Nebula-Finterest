; customUnInit runs at uninstaller startup, before electron-builder's own
; deleteAppDataOnUninstall step. We launch the still-installed app in a headless
; backup mode so local accounts are not lost without a copy.
;
; The app pins its userData to %APPDATA%\Finterest even after the Nebula Finterest
; rename (see main.ts), so existing installs keep their accounts. That folder is still
; cleaned up on uninstall: electron-builder's own uninstaller also removes
; "$APPDATA\${APP_PACKAGE_NAME}" ("finterest", matched case-insensitively on Windows),
; and only when it is a real uninstall rather than an update - so no extra macro here.
;
; v0.1.37: if the backup file is missing afterwards, an interactive uninstall asks before going
; on (never blocked: the user may have exported the data elsewhere, or not want it). A silent
; run (update, Nebula Hub) never shows a dialog: Nebula Hub makes and checks its own backup first.
; This file is UTF-8 with a BOM so that NSIS reads the accented French text correctly.
!macro customUnInit
  CreateDirectory "$DOCUMENTS\Nebula Finterest"
  ExecWait '"$INSTDIR\Nebula Finterest.exe" --backup-before-uninstall=$\"$DOCUMENTS\Nebula Finterest\finterest-uninstall-backup.json$\"'
  IfSilent finterest_backup_done
  IfFileExists "$DOCUMENTS\Nebula Finterest\finterest-uninstall-backup.json" finterest_backup_done
  MessageBox MB_YESNO|MB_ICONEXCLAMATION|MB_DEFBUTTON2 "La sauvegarde automatique de vos comptes n'a pas pu être faite.$\r$\n$\r$\nSi vous continuez, les données de Nebula Finterest sur cet ordinateur seront supprimées. Pensez à exporter vos données ailleurs (Réglages, Données, Exporter) si vous voulez pouvoir les réimporter.$\r$\n$\r$\nDésinstaller quand même ?" IDYES finterest_backup_done
  Abort
  finterest_backup_done:
!macroend
