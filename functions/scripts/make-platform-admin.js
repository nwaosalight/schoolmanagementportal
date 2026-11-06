/**
 * Promote an existing Firebase Auth user to platform (super) admin.
 *   1) Create the user in Firebase console → Authentication (or sign up via the app)
 *   2) cd functions && npm install
 *   3) export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
 *   4) node scripts/make-platform-admin.js you@example.com "First" "Last"
 */
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

(async () => {
  const [email, firstName = 'Platform', lastName = 'Admin'] = process.argv.slice(2);
  if (!email) { console.error('Usage: node make-platform-admin.js <email> [first] [last]'); process.exit(1); }
  initializeApp();
  const user = await getAuth().getUserByEmail(email);
  await getFirestore().doc(`users/${user.uid}`).set({
    schoolId: 'platform', roles: [], isPlatformAdmin: true, firstName, lastName, email,
    status: 'ACTIVE', mustChangePassword: false, createdAt: new Date(),
  });
  console.log(`✔ ${email} (${user.uid}) is now a platform admin.`);
})().catch((e) => { console.error(e); process.exit(1); });
