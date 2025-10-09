// config/firebase.js
const admin = require("firebase-admin");
const path = require("path");

// path to your downloaded service account key JSON
const serviceAccount = require("../services/serviceAccountKey.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

module.exports = admin;
