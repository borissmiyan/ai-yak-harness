/**
 * 🎨 AI Generated Design Tokens (Minimalist Luxury (Linear/Vercel))
 */
export const DESIGN_TOKENS = {
  styleName: 'Minimalist Luxury (Linear/Vercel)',
  colors: {
    bg: '#09090b',
    surface: '#121215',
    text: '#FAFAFA',
    textMuted: '#A1A1AA',
    primary: '#FFFFFF',
    border: 'rgba(255, 255, 255, 0.1)'
  },
  geometry: {
    radiusCard: '16px',
    radiusButton: '12px',
    radiusInput: '10px',
    borderWidth: '1px',
    touchHeight: '48px'
  },
  shadows: {
    card: '0 4px 20px -2px rgba(0, 0, 0, 0.5)',
    button: '0 1px 2px 0 rgba(0, 0, 0, 0.4)'
  },
  motion: {
    spring: {
      stiffness: 260,
      damping: 25
    }
  }
} as const;

export type DesignTokens = typeof DESIGN_TOKENS;
