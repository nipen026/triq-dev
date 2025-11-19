const express = require("express");
const router = express.Router();
const {
    createApproval,
    getMyApprovals,
    updateApprovalStatus,
    getAllApprovalMachines
} = require("../controllers/approval.controller")
const auth = require("../middleware/auth.middleware");
const upload = require("../middleware/uploadApproval.middleware");

router.post("/createApproval",upload.single('file'), auth, createApproval);
router.get("/getMyApprovals",auth, getMyApprovals);
router.put("/updateApprovalStatus/:id",auth, updateApprovalStatus);
router.get("/getAllApprovalMachines",auth, getAllApprovalMachines);

module.exports = router;
