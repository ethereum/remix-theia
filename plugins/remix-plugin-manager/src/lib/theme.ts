import { Plugin } from '@remixproject/engine'
import { API } from '@remixproject/plugin-utils'
import { ITheme, Theme, themeProfile } from '@remixproject/plugin-api'
import { window, ColorThemeKind, Disposable, ColorTheme } from '@theia/plugin'

// There is no way to get the value from the theme so the best solution is to reference the css varibles in webview
function getTheme(color: ColorTheme): Theme {
  const brightness = color.kind === ColorThemeKind.Dark ? 'dark' : 'light';
  return {
    brightness,
    colors: {
      surface: 'var(--theia-tab-inactiveBackground)',
      background: 'var(--theia-sidebar-background)',
      foreground: 'var(--theia-sideBar-foreground)',
      primary: 'var(--theia-button-background)',
      primaryContrast: 'var(--theia-button-foreground)',
      secondary: 'var(--theia-button-secondaryBackground)',
      secondaryContrast: 'var(--theia-button-secondaryForeground)',
      success: 'var(--theia-button-background)', // Same as primary: no success color in theia
      successContrast: 'var(--theia-button-foreground)',
      warn: 'var(--theia-inputValidation-warningBackground)',
      warnContrast: 'var(--theia-inputValidation-warningForeground)',
      error: 'var(--theia-inputValidation-errorBackground)',
      errorContrast: 'var(--theia-inputValidation-errorForeground)',
      disabled: 'var(--theia-debugIcon-breakpointDisabledForeground)',
    },
    breakpoints: {
      xs: 0,
      sm: 600,
      md: 1024,
      lg: 1440,
      xl: 1920
    },
    fontFamily: 'Segoe WPC,Segoe UI,sans-serif',
    space: 5,
  }
}

export class ThemePlugin extends Plugin implements API<ITheme> {
  listener: Disposable
  constructor() {
    super(themeProfile)
  }

  onActivation() {
    this.listener = window.onDidChangeActiveColorTheme(color => this.emit('themeChanged', getTheme(color)))
  }

  onDeactivation() {
    this.listener.dispose()
  }

  currentTheme(): Theme {
    return getTheme(window.activeColorTheme)
  }

}

