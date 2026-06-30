import './globals.css'

export const metadata = {
  title: 'GET227 -Solid works  Modelling and Graphics 2  Assignment  portal submission',
  description: 'Submission portal for GET227 engineering students.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <header className="header">
          <h1>GET227 -Solid works  Modelling and Graphics 2  Assignment  portal submission</h1>
        </header>
        
        <main className="main-container">
          {children}
        </main>
        
        <footer className="footer">
          <p>GET227 -Solid works  Modelling and Graphics 2  Assignment  portal submission | Faculty of Engineering Department of Mechanical and Aerospace</p>
        </footer>
      </body>
    </html>
  )
}
