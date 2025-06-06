import '../styles/globals.css';

import Head from 'next/head';
import { AppProps } from 'next/app';
import { SessionProvider } from 'next-auth/react';
import { Space_Grotesk } from 'next/font/google';
import { createTheme, MantineProvider, ColorSchemeScript } from '@mantine/core';
import { Toaster } from 'react-hot-toast';

const globalFont = Space_Grotesk({
  subsets: ['latin'],
  variable: '--global-font',
});

const theme = createTheme({
  primaryColor: 'blue',
  fontFamily: globalFont.style.fontFamily,
});

const App = ({ Component, pageProps }: AppProps) => {
  return (
    <>
      <Head>
        <title>Python IDE</title>
        <meta name="description" content="simple python ide for coding" />
        <link rel="shortcut icon" href="/favicon.svg" />
        <ColorSchemeScript />
      </Head>
      <SessionProvider session={pageProps.session}>
        <MantineProvider theme={theme}>
          <Component {...pageProps} />
          <Toaster position="top-center" />
        </MantineProvider>
      </SessionProvider>
    </>
  );
};

export default App;
