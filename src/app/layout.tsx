import type { Metadata } from "next";
import "./globals.css";


export const metadata: Metadata = {
  title: "WanderWorks – AI Travel Assistant",
  description: "Your multilingual travel buddy with AI + translation assistance",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}