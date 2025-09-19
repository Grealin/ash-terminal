import { isModalLayoutOpenAtom, isModalThemeOpenAtom, isModalToolOpenAtom } from '@/store'
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
