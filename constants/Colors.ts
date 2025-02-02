const primaryColor = "#3498db"
const secondaryColor = "#e74c3c"
const backgroundColor = "#f8f9fa"
const cardColor = "#ffffff"
const textColor = "#333333"

export default {
  light: {
    text: textColor,
    background: backgroundColor,
    tint: primaryColor,
    tabIconDefault: "#bdc3c7",
    tabIconSelected: primaryColor,
    card: cardColor,
    border: "#ecf0f1",
    error: secondaryColor,
    success: "#2ecc71",
    warning: "#f39c12",
    button: primaryColor,
    buttonText: "#ffffff",
    inputBackground: "#ffffff",
    placeholder: "#95a5a6",
  },
  dark: {
    text: "#ffffff",
    background: "#000000",
    tint: "#ffffff",
    tabIconDefault: "#6c7a89",
    tabIconSelected: "#ffffff",
    card: "#1e1e1e",
    border: "#2c3e50",
    error: secondaryColor,
    success: "#2ecc71",
    warning: "#f39c12",
    button: primaryColor,
    buttonText: "#ffffff",
    inputBackground: "#2c3e50",
    placeholder: "#bdc3c7",
  },
}
