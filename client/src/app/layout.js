import { ThemeProvider } from "@/components/theme-provider";
import { ClientToaster } from "@/components/toaster";

import "./globals.css";
import { AuthProvider } from "@/context/auth-context";

export const metadata = {
  title: "Next.js Boilerplate",
  description: "A modern, production-ready Next.js boilerplate",
  icons: [
    { rel: "icon", url: "/favicon.ico" },
    { rel: "icon", url: "/favicon.png", type: "image/png" },
    { rel: "apple-touch-icon", url: "/apple-touch-icon.png", sizes: "180x180" },
    { rel: "shortcut icon", url: "/favicon.ico" },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
            <ClientToaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
