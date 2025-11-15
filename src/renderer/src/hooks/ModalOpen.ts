import {
  isModalLayoutOpenAtom,
  isModalSessionOpenAtom,
  isModalTerminalSettingsOpenAtom,
  isModalThemeOpenAtom,
  isModalToolOpenAtom,
  isModalUploadOpenAtom
} from '@/store'
import { useAtom } from 'jotai'

export const useModalTheme = () => {
  const [isModalOpen, setIsModalOpen] = useAtom(isModalThemeOpenAtom)
  const openModal = () => setIsModalOpen(true)
  const closeModal = () => setIsModalOpen(false)
  return {
    isModalOpen,
    openModal,
    closeModal
  }
}

export const useModalUpload = () => {
  const [isModalOpen, setIsModalOpen] = useAtom(isModalUploadOpenAtom)
  const openModal = () => setIsModalOpen(true)
  const closeModal = () => setIsModalOpen(false)
  return {
    isModalOpen,
    openModal,
    closeModal
  }
}

export const useModalLayout = () => {
  const [isModalOpen, setIsModalOpen] = useAtom(isModalLayoutOpenAtom)
  const openModal = () => setIsModalOpen(true)
  const closeModal = () => setIsModalOpen(false)
  return {
    isModalOpen,
    openModal,
    closeModal
  }
}

export const useModalTool = () => {
  const [isModalOpen, setIsModalOpen] = useAtom(isModalToolOpenAtom)
  const openModal = () => setIsModalOpen(true)
  const closeModal = () => setIsModalOpen(false)
  return {
    isModalOpen,
    openModal,
    closeModal
  }
}

export const useModalSession = () => {
  const [isModalOpen, setIsModalOpen] = useAtom(isModalSessionOpenAtom)
  const openModal = () => setIsModalOpen(true)
  const closeModal = () => setIsModalOpen(false)
  return {
    isModalOpen,
    openModal,
    closeModal
  }
}

export const useModalTerminalSettings = () => {
  const [isModalOpen, setIsModalOpen] = useAtom(isModalTerminalSettingsOpenAtom)
  const openModal = () => setIsModalOpen(true)
  const closeModal = () => setIsModalOpen(false)
  return {
    isModalOpen,
    openModal,
    closeModal
  }
}
