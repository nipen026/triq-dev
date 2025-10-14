const express = require("express");
const router = express.Router();
const notificationController = require('../controllers/notification.controller')
const auth = require("../middleware/auth.middleware"); // JWT or session middleware
const upload = require("../middleware/uploadProfileImage.middleware");

// Profile routes
// All routes are protected and require authentication
router.post("/sendorganizationrequest", auth, notificationController.sendOrganizationRequest);
router.get('/getnotification',auth, notificationController.getNotifications);
router.get('/markNotificationAsRead/:id',auth, notificationController.markNotificationAsRead)
router.get('/deleteNotification/:id',auth, notificationController.deleteNotification)
router.post("/updateticketnotification",auth,notificationController.updateNotificationTicket)

module.exports = router;
