import { InstrumentSans_400Regular, InstrumentSans_500Medium, InstrumentSans_600SemiBold, InstrumentSans_700Bold, useFonts } from '@expo-google-fonts/instrument-sans';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AddedToast } from '@/components/AddedToast';
import { CartProvider } from '@/state/cart';
import { SizeProvider } from '@/state/size';
import { C, F } from '@/theme';

SplashScreen.preventAutoHideAsync();

// Always light: the brand is a white storefront.
const theme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: C.bg, card: C.bg, text: C.ink, border: C.line, primary: C.ink } };

export default function RootLayout() {
  const [loaded, error] = useFonts({ InstrumentSans_400Regular, InstrumentSans_500Medium, InstrumentSans_600SemiBold, InstrumentSans_700Bold });
  useEffect(() => { if (loaded || error) SplashScreen.hideAsync(); }, [loaded, error]);
  if (!loaded && !error) return null;
  return (
    <SafeAreaProvider>
      <ThemeProvider value={theme}>
        <SizeProvider>
          <CartProvider>
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerTitleStyle: { fontFamily: F.semibold, fontSize: 16 }, headerShadowVisible: false, headerBackButtonDisplayMode: 'minimal', headerTintColor: C.ink, contentStyle: { backgroundColor: C.bg } }}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="produit/[handle]" options={{ title: '' }} />
              <Stack.Screen name="collection/[handle]" options={{ title: '' }} />
              <Stack.Screen name="page/[slug]" options={{ title: '' }} />
            </Stack>
            <AddedToast />
          </CartProvider>
        </SizeProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
