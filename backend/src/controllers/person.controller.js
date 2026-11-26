const Person = require("../models/person.model");

// ─────────────────────────────────────────────────────────────────────────────
// 1. POST /api/persons  →  Add a new person
// ─────────────────────────────────────────────────────────────────────────────
const addPerson = async (req, res) => {
  try {
    const userId = req.user._id;
    const { fullName, relation, gender, dob, tob, pob, notes } = req.body;

    if (!fullName) {
      return res.status(400).json({ success: false, message: "fullName is required." });
    }

    const person = await Person.create({
      userId,
      fullName,
      relation: relation || "other",
      gender: gender || "other",
      dob: dob || null,
      tob: tob || null,
      pob: pob || null,
      notes: notes || "",
    });

    return res.status(201).json({
      success: true,
      message: "Person added successfully.",
      data: person,
    });
  } catch (error) {
    console.error("addPerson error:", error);
    return res.status(500).json({ success: false, message: "Failed to add person.", error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. GET /api/persons  →  Get all persons added by current user
// ─────────────────────────────────────────────────────────────────────────────
const getMyPersons = async (req, res) => {
  try {
    const userId = req.user._id;

    const persons = await Person.find({ userId }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: persons.length,
      data: persons,
    });
  } catch (error) {
    console.error("getMyPersons error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch persons.", error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. GET /api/persons/:personId  →  Get a single person
// ─────────────────────────────────────────────────────────────────────────────
const getPersonById = async (req, res) => {
  try {
    const { personId } = req.params;
    const userId = req.user._id;

    const person = await Person.findOne({ _id: personId, userId });
    if (!person) {
      return res.status(404).json({ success: false, message: "Person not found." });
    }

    return res.status(200).json({ success: true, data: person });
  } catch (error) {
    console.error("getPersonById error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch person.", error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. PUT /api/persons/:personId  →  Update a person
// ─────────────────────────────────────────────────────────────────────────────
const updatePerson = async (req, res) => {
  try {
    const { personId } = req.params;
    const userId = req.user._id;
    const { fullName, relation, gender, dob, tob, pob, notes } = req.body;

    const person = await Person.findOne({ _id: personId, userId });
    if (!person) {
      return res.status(404).json({ success: false, message: "Person not found." });
    }

    if (fullName) person.fullName = fullName;
    if (relation) person.relation = relation;
    if (gender) person.gender = gender;
    if (dob !== undefined) person.dob = dob;
    if (tob !== undefined) person.tob = tob;
    if (pob !== undefined) person.pob = pob;
    if (notes !== undefined) person.notes = notes;

    await person.save();

    return res.status(200).json({
      success: true,
      message: "Person updated successfully.",
      data: person,
    });
  } catch (error) {
    console.error("updatePerson error:", error);
    return res.status(500).json({ success: false, message: "Failed to update person.", error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. DELETE /api/persons/:personId  →  Delete a person
// ─────────────────────────────────────────────────────────────────────────────
const deletePerson = async (req, res) => {
  try {
    const { personId } = req.params;
    const userId = req.user._id;

    const person = await Person.findOneAndDelete({ _id: personId, userId });
    if (!person) {
      return res.status(404).json({ success: false, message: "Person not found." });
    }

    return res.status(200).json({
      success: true,
      message: "Person deleted successfully.",
    });
  } catch (error) {
    console.error("deletePerson error:", error);
    return res.status(500).json({ success: false, message: "Failed to delete person.", error: error.message });
  }
};

module.exports = {
  addPerson,
  getMyPersons,
  getPersonById,
  updatePerson,
  deletePerson,
};
