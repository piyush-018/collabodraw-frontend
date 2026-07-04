import { ClerkProvider, SignInButton, Show, UserButton } from '@clerk/nextjs'
import { dark } from '@clerk/themes'
import './globals.css'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider appearance={{ baseTheme: dark }as any}>
      <html lang="en">
        <body className="flex flex-col h-screen overflow-hidden bg-background text-foreground">
          {/* Top Navbar */}
          <header className="flex justify-between items-center px-6 py-3 bg-card border-b border-border z-50">
            <h1 className="text-xl font-bold tracking-tight">CollaboDraw Studio</h1>
            <div>
              {/* Jab user logged out ho */}
              <Show when="signed-out">
                <SignInButton mode="modal">
                  <button className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md font-medium transition-colors">
                    Sign In
                  </button>
                </SignInButton>
              </Show>
              
              {/* Jab user logged in ho */}
              <Show when="signed-in">
                <UserButton />
              </Show>
            </div>
          </header>
          
          {/* Main Canvas Area */}
          <main className="flex-1 relative flex flex-col">
            {children}
          </main>
        </body>
      </html>
    </ClerkProvider>
  )
}