/* ============================================================
   OneBudget — optional GitHub sign-in config
   ============================================================

   Backup/sync is OPTIONAL. The app works fully offline with no
   account; this file only matters if you want one-tap
   "Continue with GitHub" inside the Android app.

   To enable it:
   1. github.com/settings/developers > OAuth Apps > New OAuth App
   2. Tick "Enable Device Flow" (no redirect URL needed)
   3. Copy the Client ID into GITHUB_CLIENT_ID below.
   Signing in with a personal access token works with no config.
*/
window.OB_CONFIG = {
  GITHUB_CLIENT_ID: '',
};
