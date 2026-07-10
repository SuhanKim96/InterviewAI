import { createContext, useContext, useEffect, useState } from 'react'

export const ThemeContext = createContext({ dark: false, toggleTheme: () => {} })

export const useTheme = () => useContext(ThemeContext)

// index.html sets the .dark class before the app mounts to avoid a flash;
// this hook takes over from there and keeps localStorage in sync.
export function useThemeState() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  return { dark, toggleTheme: () => setDark((d) => !d) }
}
