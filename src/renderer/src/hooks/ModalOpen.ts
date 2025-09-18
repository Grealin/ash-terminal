import { isModalThemeOpenAtom } from '@/store'
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
