; customUnInit runs at uninstaller startup, before electron-builder's own
; deleteAppDataOnUninstall step. We launch the still-installed app in a headless
; backup mode so local accounts are not lost without a copy.
;
; The app pins its userData to %APPDATA%\Finterest even after the Nebula Finterest
; rename (see main.ts), so existing installs keep their accounts. That folder is still
; cleaned up on uninstall: electron-builder's own uninstaller also removes
; "$APPDATA\${APP_PACKAGE_NAME}" ("finterest", matched case-insensitively on Windows),
; and only when it is a real uninstall rather than an update - so no extra macro here.
!macro customUnInit
  CreateDirectory "$DOCUMENTS\Nebula Finterest"
  ExecWait '"$INSTDIR\Nebula Finterest.exe" --backup-before-uninstall=$\"$DOCUMENTS\Nebula Finterest\finterest-uninstall-backup.json$\"'
!macroend
