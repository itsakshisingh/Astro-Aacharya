const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth.middleware");
const {
  addPerson,
  getMyPersons,
  getPersonById,
  updatePerson,
  deletePerson,
} = require("../controllers/person.controller");

// POST   /api/persons           → Add new person
router.post("/", authenticate, addPerson);

// GET    /api/persons           → Get all my persons
router.get("/", authenticate, getMyPersons);

// GET    /api/persons/:personId → Get single person
router.get("/:personId", authenticate, getPersonById);

// PUT    /api/persons/:personId → Update person
router.put("/:personId", authenticate, updatePerson);
router.patch("/:personId", authenticate, updatePerson);

// DELETE /api/persons/:personId → Delete person
router.delete("/:personId", authenticate, deletePerson);

module.exports = router;
