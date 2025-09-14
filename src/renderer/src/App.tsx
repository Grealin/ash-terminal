import { DraggableTopBar, RootLayout } from './components'

const App: React.FC = () => {
  return (
    <>
      <RootLayout>
        <DraggableTopBar />
        <div>Hello World!!!</div>
      </RootLayout>
    </>
  )
}

export default App
