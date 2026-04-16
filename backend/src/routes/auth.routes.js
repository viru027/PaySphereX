// ============================================================
// src/routes/auth.routes.js
// ============================================================
const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/auth.controller");
const { protect } = require("../middleware/auth.middleware");
const { body }    = require("express-validator");
const { validate }= require("../middleware/validate.middleware");

const pwRules = [
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/[A-Z]/).withMessage("Must contain uppercase")
    .matches(/[0-9]/).withMessage("Must contain number"),
];

router.post("/login",
  [body("email").isEmail().normalizeEmail(), body("password").notEmpty()],
  validate,
  ctrl.login
);

router.post("/refresh",   ctrl.refreshToken);
router.post("/logout",    protect, ctrl.logout);
router.get ("/me",        protect, ctrl.getMe);
router.patch("/change-password",
  protect,
  [body("currentPassword").notEmpty(), ...pwRules.map(r => r.withMessage)],
  ctrl.changePassword
);

module.exports = router;
