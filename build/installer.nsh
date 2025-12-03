; NSIS Custom Installer Script for Promptfoo++
; Checks and installs Node.js and promptfoo during installation

!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "FileFunc.nsh"

; Variables
Var NodeJsInstalled
Var NodeJsVersion
Var PromptfooInstalled
Var NpmPath

; Custom page for dependency installation
Page custom DependencyCheckPage DependencyInstallPage

; Function to check if Node.js is installed
Function CheckNodeJs
  nsExec::ExecToStack 'node --version'
  Pop $0 ; return code
  Pop $1 ; output

  ${If} $0 == 0
    StrCpy $NodeJsInstalled "true"
    StrCpy $NodeJsVersion $1
    DetailPrint "Node.js detected: $NodeJsVersion"
  ${Else}
    StrCpy $NodeJsInstalled "false"
    DetailPrint "Node.js not detected"
  ${EndIf}
FunctionEnd

; Function to check if promptfoo is installed
Function CheckPromptfoo
  nsExec::ExecToStack 'where promptfoo'
  Pop $0

  ${If} $0 == 0
    StrCpy $PromptfooInstalled "true"
    DetailPrint "promptfoo detected"
  ${Else}
    StrCpy $PromptfooInstalled "false"
    DetailPrint "promptfoo not detected"
  ${EndIf}
FunctionEnd

; Custom dependency check page
Function DependencyCheckPage
  !insertmacro MUI_HEADER_TEXT "Dependency Check" "Checking required dependencies..."

  Call CheckNodeJs
  Call CheckPromptfoo

  ; Skip if all dependencies are installed
  ${If} $NodeJsInstalled == "true"
  ${AndIf} $PromptfooInstalled == "true"
    Abort ; Skip this page
  ${EndIf}
FunctionEnd

; Custom dependency installation page
Function DependencyInstallPage
  ; Show message box about missing dependencies
  ${If} $NodeJsInstalled == "false"
    MessageBox MB_YESNO|MB_ICONQUESTION "Node.js (v16+) is required but not installed.$\n$\nWould you like to download and install Node.js now?$\n$\n(The installer will open the Node.js download page in your browser)" IDYES DownloadNode IDNO SkipNode

    DownloadNode:
      ExecShell "open" "https://nodejs.org/en/download/"
      MessageBox MB_OK "Please install Node.js and run this installer again."
      Quit

    SkipNode:
      MessageBox MB_OK|MB_ICONEXCLAMATION "Warning: Promptfoo++ requires Node.js to function properly.$\n$\nYou can install it later from: https://nodejs.org"
  ${EndIf}

  ; If Node.js is installed but promptfoo is not, install promptfoo
  ${If} $NodeJsInstalled == "true"
  ${AndIf} $PromptfooInstalled == "false"
    MessageBox MB_YESNO|MB_ICONQUESTION "The 'promptfoo' CLI tool is required but not installed.$\n$\nWould you like to install it now using npm?" IDYES InstallPromptfoo IDNO SkipPromptfoo

    InstallPromptfoo:
      DetailPrint "Installing promptfoo globally..."
      nsExec::ExecToLog 'npm install -g promptfoo'
      Pop $0

      ${If} $0 == 0
        MessageBox MB_OK|MB_ICONINFORMATION "promptfoo installed successfully!"
        DetailPrint "promptfoo installed successfully"
      ${Else}
        MessageBox MB_OK|MB_ICONEXCLAMATION "Failed to install promptfoo automatically.$\n$\nYou can install it manually later using:$\n$\nnpm install -g promptfoo"
        DetailPrint "Failed to install promptfoo"
      ${EndIf}
      Goto EndPromptfooInstall

    SkipPromptfoo:
      MessageBox MB_OK|MB_ICONINFORMATION "You can install promptfoo later using:$\n$\nnpm install -g promptfoo"

    EndPromptfooInstall:
  ${EndIf}
FunctionEnd

; Custom function to run after installation
Function .onInstSuccess
  ; Verify installation
  DetailPrint "Verifying installation..."
  Call CheckNodeJs
  Call CheckPromptfoo

  ; Show final message
  ${If} $NodeJsInstalled == "true"
  ${AndIf} $PromptfooInstalled == "true"
    MessageBox MB_OK|MB_ICONINFORMATION "Installation complete!$\n$\nAll dependencies are installed and ready.$\n$\nYou can now launch Promptfoo++."
  ${ElseIf} $NodeJsInstalled == "false"
    MessageBox MB_OK|MB_ICONEXCLAMATION "Installation complete, but Node.js is not installed.$\n$\nPlease install Node.js from: https://nodejs.org$\n$\nThen install promptfoo using:$\nnpm install -g promptfoo"
  ${ElseIf} $PromptfooInstalled == "false"
    MessageBox MB_OK|MB_ICONINFORMATION "Installation complete, but promptfoo is not installed.$\n$\nPlease run:$\nnpm install -g promptfoo$\n$\nYou can do this from the command prompt."
  ${EndIf}
FunctionEnd
