const router = require("express").Router();
const controller = require("../controllers/appLinks.controller");

router.get("/", controller.getLinks);
router.put("/", controller.upsertLinks);
router.delete("/:id", controller.deleteLinks);

module.exports = router;