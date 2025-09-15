import { DraggableTopBar, RootLayout } from './components'

const App: React.FC = () => {
  return (
    <>
      <RootLayout>
        <DraggableTopBar />
        <div className="flex-1 flex items-center justify-center text-slate-700 dark:text-slate-300">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-indigo-400">
              ASH Terminal
            </h1>
            <p className="text-lg dark:text-red-400">Hello World!!!</p>
          </div>
        </div>
      </RootLayout>
    </>
  )
}

export default App
