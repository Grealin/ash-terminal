import { createContext, useContext } from 'react'

export const ConfigContext = createContext<{
  updateConfigField: (path: string, value: unknown) => void
}>({ updateConfigField: () => {} })

export const useConfigContext = (): {
  updateConfigField: (path: string, value: unknown) => void
} => useContext(ConfigContext)
