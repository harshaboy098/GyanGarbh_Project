# Firebase Setup Guide for Google Login

## Step 1: Create a Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter your project name (e.g., "gyan-garbh-auth")
4. Enable Google Analytics if you want (optional)
5. Click "Create project"

## Step 2: Enable Google Authentication
1. In your Firebase project, go to "Authentication" in the left sidebar
2. Click on the "Sign-in method" tab
3. Find "Google" in the provider list and click on it
4. Click "Enable"
5. Enter a support email
6. Click "Save"

## Step 3: Get Firebase Configuration
1. Go to "Project Settings" (gear icon in the left sidebar)
2. Scroll down to "Your apps" section
3. Click "Add app" and select the web icon (</>)
4. Register your app with a nickname (e.g., "Gyan Garbh Web")
5. Copy the Firebase configuration object

## Step 4: Update Configuration in index.html
1. Open `frontend/index.html`
2. Find the `firebaseConfig` object
3. Replace the placeholder values with your actual Firebase config:

```javascript
const firebaseConfig = {
    apiKey: "your-actual-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-actual-app-id"
};
```

## Step 5: Enable Google Sign-in in Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (same as Firebase project)
3. Go to "APIs & Services" > "Credentials"
4. Find your OAuth 2.0 Client ID (created by Firebase)
5. Add your domain to "Authorized JavaScript origins" (e.g., `http://localhost:3000` for development)
6. Add your redirect URIs if needed

## Step 6: Test Google Login
1. Start your backend server: `cd backend && node server.js`
2. Open your frontend in a browser
3. Try the "Continue with Google" button
4. The first time, you'll need to grant permissions

## Important Notes:
- For production, make sure to:
  - Add your production domain to authorized origins
  - Enable security rules in Firebase
  - Set up proper error handling
- Google login creates users with default 'guest' role
- Users can later update their phone and address in their profile

## Troubleshooting:
- If Google login doesn't work, check browser console for errors
- Make sure Firebase config is correct
- Ensure Google Cloud Console has correct authorized domains
- Check that the backend `/google-login` endpoint is accessible</content>
<parameter name="filePath">c:\Users\USER\Desktop\GyanGarbh_Project\FIREBASE_SETUP.md