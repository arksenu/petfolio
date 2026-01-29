# Petfolio Known Issues

This document tracks known bugs and limitations in the current version of Petfolio.

## Critical Bugs

### Delete Functionality Not Working (Desktop/Mobile Web)

**Affected Features:**
- Delete pet button (trash icon in pet profile header)
- Delete document button
- Delete vaccination button
- Delete medication button
- Delete reminder button

**Symptoms:**
Pressing the delete icons does nothing. No confirmation dialog appears and no deletion occurs.

**Likely Cause:**
The delete handlers may be using `Alert.alert()` which doesn't work on web platforms, or the `onPress` handlers may not be properly connected.

**Priority:** High

---

### PDF Viewer Not Working on Web

**Symptoms:**
When viewing a PDF document on the desktop web preview, an error message appears at the top of the screen: "React Native WebView does not support this platform."

**Cause:**
The `react-native-webview` package is used for PDF viewing, but it doesn't support the web platform. The WebView component renders nothing on web.

**Workaround:**
PDFs work correctly in Expo Go (opens in iOS file preview) and would work in a standalone build.

**Solution Needed:**
Implement a web-specific PDF viewer using an iframe with Google Docs viewer or a library like `react-pdf`.

**Priority:** Medium

---

### Log Dose Button Not Working

**Symptoms:**
Clicking the "Log Dose" button on a medication does nothing.

**Likely Cause:**
The `onPress` handler may be using `Alert.alert()` for confirmation, which doesn't work on web.

**Priority:** Medium

---

## Platform-Specific Limitations

### Expo Go OAuth Sign-In Not Supported

**Symptoms:**
When trying to sign in from Expo Go, the OAuth flow fails with "redirect_uri scheme 'exp' is not allowed."

**Cause:**
The OAuth provider (Manus) does not allow the `exp://` URL scheme that Expo Go uses for deep linking. This is a security restriction on the OAuth provider side.

**Workarounds:**
1. Use the web preview URL for sign-in (full OAuth support)
2. Build a standalone app with `expo prebuild` and run through Xcode/Android Studio

**Status:** Cannot be fixed - OAuth provider restriction

---

## Settings Features Not Implemented

The following settings features are placeholders and not yet implemented:

- **Export Data** - Export all pet data to a file
- **Privacy** - Privacy settings and data management
- **Delete All Data** - Button exists but functionality not implemented

---

## Notes

### Web vs Native Behavior Differences

| Feature | Web | Expo Go | Standalone Build |
|---------|-----|---------|------------------|
| Sign In/Out | Works | Not available | Works |
| Delete actions | Not working | Works (Alert.alert) | Works |
| PDF viewing | Not working | Opens externally | Works |
| Cloud sync | Works | Not available | Works |
| Haptic feedback | No | Yes | Yes |

### Testing Recommendations

1. **Desktop Web Preview**: Best for testing sign-in flow and cloud sync
2. **Expo Go**: Best for testing native features (camera, haptics, local storage)
3. **Standalone Build**: Required for full production testing

---

*Last updated: January 28, 2026*
