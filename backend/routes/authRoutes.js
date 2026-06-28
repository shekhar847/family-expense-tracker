const express = require("express");
const router = express.Router();
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage });

const { register, login, uploadAvatar, updateProfile, changePassword } = require("../controllers/authController");

router.post("/register", register);
router.post("/login", login);
router.post("/upload-avatar", upload.single("avatar"), uploadAvatar);
router.put("/update-profile", updateProfile);
router.put("/change-password", changePassword);

module.exports = router;