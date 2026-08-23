; customUnInit runs at uninstaller startup, before electron-builder's own
; deleteAppDataOnUninstall step removes %APPDATA%\Finterest (accounts.json and
; every finterest-<accountId>.sqlite file). We launch the still-installed app
; in a headless backup mode so local accounts are not lost without a copy.
!macro customUnInit
  CreateDirectory "$DOCUMENTS\Finterest"
  ExecWait '"$INSTDIR\Finterest.exe" --backup-before-uninstall=$\"$DOCUMENTS\Finterest\finterest-uninstall-backup.json$\"'
!macroend
