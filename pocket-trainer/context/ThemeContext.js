import React, { createContext, useContext, useState } from 'react'

export const light = {
  dark: false,
  bg: '#f7f7f8',
  card: '#ffffff',
  cardBorder: '#e5e5ea',
  text: '#111111',
  subtext: '#6b6b6b',
  placeholder: '#aaaaaa',
  inputBg: '#ffffff',
  inputBorder: '#d8d8dc',
  tabBar: '#ffffff',
  tabBorder: '#e5e5ea',
  header: '#ffffff',
  headerText: '#111111',
  divider: '#e5e5ea',
  rowAlt: '#f2f2f7',
  bubbleBg: '#ededf0',
  bubbleText: '#111111',
  macroBg: '#e5e5ea',
  accent: '#6C47FF',
  danger: '#FF3B30',
  muted: '#aaaaaa',
}

export const dark = {
  dark: true,
  bg: '#1c1c1e',
  card: '#2c2c2e',
  cardBorder: '#3a3a3c',
  text: '#ffffff',
  subtext: '#ababab',
  placeholder: '#6b6b6b',
  inputBg: '#2c2c2e',
  inputBorder: '#3a3a3c',
  tabBar: '#1c1c1e',
  tabBorder: '#2c2c2e',
  header: '#1c1c1e',
  headerText: '#ffffff',
  divider: '#2c2c2e',
  rowAlt: '#252527',
  bubbleBg: '#2c2c2e',
  bubbleText: '#e0e0e0',
  macroBg: '#3a3a3c',
  accent: '#6C47FF',
  danger: '#FF453A',
  muted: '#6b6b6b',
}

const ThemeContext = createContext({ theme: light, toggleTheme: () => {} })

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false)
  return (
    <ThemeContext.Provider value={{ theme: isDark ? dark : light, toggleTheme: () => setIsDark(p => !p) }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
