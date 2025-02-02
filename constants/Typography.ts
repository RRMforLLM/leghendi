import { StyleSheet } from "react-native"

export const typography = StyleSheet.create({
  h1: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 16,
  },
  h2: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 14,
  },
  h3: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
  },
  caption: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.7,
  },
})

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
}

