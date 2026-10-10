import { useEffect, useState } from 'react';
import { useStore } from '../store/AppStore';

const TOKENS = ['primary', 'accent', 'success', 'line', 'muted', 'subtle', 'surface', 'surface-2', 'fg'] as const;
type Token = (typeof TOKENS)[number];
type Colors = Record<Token, string>;

function readColors(): Colors {
  const css = getComputedStyle(document.documentElement);
  const out = {} as Colors;
  for (const t of TOKENS) out[t] = `rgb(${css.getPropertyValue(`--${t}`).trim().split(/\s+/).join(',')})`;
  return out;
}

/**
 * Colores del tema actual en formato rgb(), para atributos SVG (que no
 * resuelven variables CSS). Se leen en un efecto pasivo, que se ejecuta
 * después de que AppStore aplique la clase del tema en su layout effect.
 */
export function useThemeColors(): Colors {
  const { state } = useStore();
  const theme = state.settings.theme;
  const [colors, setColors] = useState<Colors>(readColors);
  useEffect(() => setColors(readColors()), [theme]);
  return colors;
}
