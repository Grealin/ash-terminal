export const AiHistoryView: React.FC = () => {
  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 p-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">历史记录</h3>
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">暂无历史记录</p>
      </div>
    </div>
  )
}
