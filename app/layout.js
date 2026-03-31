import '@/styles/globals.css';
import { AuthProvider } from '@/lib/auth-context';

export const metadata = {
  title: 'POC Scenario Tool',
  description: 'Visualise POC scenario walkthroughs with branching paths, tool integrations, and persona mapping.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
