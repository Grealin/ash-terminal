import {
  isModalAboutOpenAtom,
  isModalFileSettingOpenAtom,
  isModalLayoutOpenAtom,
  isModalMonitorSettingsOpenAtom,
  isModalSessionOpenAtom,
  isModalShortcutOpenAtom,
  isModalTerminalSettingsOpenAtom,
  isModalThemeOpenAtom,
  isModalToolOpenAtom,
  isModalUploadOpenAtom
} from '@/store'
import { useAtom } from 'jotai'

export const useModalTheme = (): {
  isModalOpen: boolean
  openModal: () => void
  closeModal: () => void
} => {
  const [isModalOpen, setIsModalOpen] = useAtom(isModalThemeOpenAtom)
  const openModal = (): void => setIsModalOpen(true)
  const closeModal = (): void => setIsModalOpen(false)
  return {
    isModalOpen,
    openModal,
    closeModal
  }
}

export const useModalUpload = (): {
  isModalOpen: boolean
  openModal: () => void
  closeModal: () => void
} => {
  const [isModalOpen, setIsModalOpen] = useAtom(isModalUploadOpenAtom)
  const openModal = (): void => setIsModalOpen(true)
  const closeModal = (): void => setIsModalOpen(false)
  return {
    isModalOpen,
    openModal,
    closeModal
  }
}

export const useModalLayout = (): {
  isModalOpen: boolean
  openModal: () => void
  closeModal: () => void
} => {
  const [isModalOpen, setIsModalOpen] = useAtom(isModalLayoutOpenAtom)
  const openModal = (): void => setIsModalOpen(true)
  const closeModal = (): void => setIsModalOpen(false)
  return {
    isModalOpen,
    openModal,
    closeModal
  }
}

export const useModalTool = (): {
  isModalOpen: boolean
  openModal: () => void
  closeModal: () => void
} => {
  const [isModalOpen, setIsModalOpen] = useAtom(isModalToolOpenAtom)
  const openModal = (): void => setIsModalOpen(true)
  const closeModal = (): void => setIsModalOpen(false)
  return {
    isModalOpen,
    openModal,
    closeModal
  }
}

export const useModalSession = (): {
  isModalOpen: boolean
  openModal: () => void
  closeModal: () => void
} => {
  const [isModalOpen, setIsModalOpen] = useAtom(isModalSessionOpenAtom)
  const openModal = (): void => setIsModalOpen(true)
  const closeModal = (): void => setIsModalOpen(false)
  return {
    isModalOpen,
    openModal,
    closeModal
  }
}

export const useModalTerminalSettings = (): {
  isModalOpen: boolean
  openModal: () => void
  closeModal: () => void
} => {
  const [isModalOpen, setIsModalOpen] = useAtom(isModalTerminalSettingsOpenAtom)
  const openModal = (): void => setIsModalOpen(true)
  const closeModal = (): void => setIsModalOpen(false)
  return {
    isModalOpen,
    openModal,
    closeModal
  }
}

export const useModalMonitorSettings = (): {
  isModalOpen: boolean
  openModal: () => void
  closeModal: () => void
} => {
  const [isModalOpen, setIsModalOpen] = useAtom(isModalMonitorSettingsOpenAtom)
  const openModal = (): void => setIsModalOpen(true)
  const closeModal = (): void => setIsModalOpen(false)
  return {
    isModalOpen,
    openModal,
    closeModal
  }
}

export const useModalAbout = (): {
  isModalOpen: boolean
  openModal: () => void
  closeModal: () => void
} => {
  const [isModalOpen, setIsModalOpen] = useAtom(isModalAboutOpenAtom)
  const openModal = (): void => setIsModalOpen(true)
  const closeModal = (): void => setIsModalOpen(false)
  return {
    isModalOpen,
    openModal,
    closeModal
  }
}

export const useModalShortcut = (): {
  isModalOpen: boolean
  openModal: () => void
  closeModal: () => void
} => {
  const [isModalOpen, setIsModalOpen] = useAtom(isModalShortcutOpenAtom)
  const openModal = (): void => setIsModalOpen(true)
  const closeModal = (): void => setIsModalOpen(false)
  return {
    isModalOpen,
    openModal,
    closeModal
  }
}

export const useModalFileSetting = (): {
  isModalOpen: boolean
  openModal: () => void
  closeModal: () => void
} => {
  const [isModalOpen, setIsModalOpen] = useAtom(isModalFileSettingOpenAtom)
  const openModal = (): void => setIsModalOpen(true)
  const closeModal = (): void => setIsModalOpen(false)
  return {
    isModalOpen,
    openModal,
    closeModal
  }
}
