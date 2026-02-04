export const getFriendlyAuthError = (error) => {
  if (!error?.code) {
    return "Something went wrong. Please try again.";
  }

  switch (error.code) {
    case "auth/user-not-found":
      return "No account found with this email.";

    case "auth/wrong-password":
      return "Incorrect email or password.";

    case "auth/invalid-credential":
      return "The email or password you entered is incorrect.";

    case "auth/invalid-email":
      return "Please enter a valid email address.";

    case "auth/user-disabled":
      return "This account has been disabled. Contact support.";

    case "auth/too-many-requests":
      return "Too many failed attempts. Please try again later.";

    case "auth/popup-closed-by-user":
      return "Google sign-in was cancelled.";

    case "auth/account-exists-with-different-credential":
      return "An account already exists with this email using another sign-in method.";

    case "auth/network-request-failed":
      return "Network error. Check your internet connection.";

    default:
      return "Authentication failed. Please try again.";
  }
};
