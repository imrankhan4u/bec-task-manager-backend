const express = require("express");
const router = express.Router();
const Task = require("../models/Task");
const { authMiddleware, authorizeRoles, authorizeDepartment } = require("../middleware/authMiddleware");

// Principal assigns tasks to HODs in any department
router.post("/", authMiddleware, authorizeRoles(["Principal"]), async (req, res) => {
  try {
    const { title, description, assignedTo } = req.body;

    if (!title || !description || !assignedTo) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Ensure assignedTo is an HOD
    if (!assignedTo.startsWith("HOD-")) {
      return res.status(403).json({ message: "Only HODs can be assigned tasks by the Principal" });
    }

    const newTask = new Task({ title, description, assignedTo });
    await newTask.save();
    res.status(201).json(newTask);
  } catch (error) {
    res.status(500).json({ message: "Error creating task", error });
  }
});

// HOD assigns tasks to Faculty in the same department
router.post("/hod", authMiddleware, authorizeDepartment("HOD"), async (req, res) => {
  try {
    const { title, description, assignedTo } = req.body;

    if (!title || !description || !assignedTo) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Ensure assignedTo is a Faculty and belongs to the same department
    const assignedDepartment = assignedTo.split("-")[1];
    if (!assignedTo.startsWith("Faculty-") || assignedDepartment !== req.user.department) {
      return res.status(403).json({ message: "HOD can only assign tasks to Faculty in their own department" });
    }

    const newTask = new Task({ title, description, assignedTo });
    await newTask.save();
    res.status(201).json(newTask);
  } catch (error) {
    res.status(500).json({ message: "Error creating task", error });
  }
});

// Get all tasks (Principals see all, HODs see their assigned and given tasks, Faculty see their assigned tasks)
router.get("/", authMiddleware, async (req, res) => {
  try {
    let tasks;

    if (req.user.role === "Principal") {
      tasks = await Task.find(); // Principal sees all tasks
    } else if (req.user.role.startsWith("HOD-")) {
      tasks = await Task.find({
        $or: [{ assignedTo: req.user.role }, { assignedTo: new RegExp(`^Faculty-${req.user.department}`) }],
      });
    } else if (req.user.role.startsWith("Faculty-")) {
      tasks = await Task.find({ assignedTo: req.user.role });
    } else {
      return res.status(403).json({ message: "Access denied" });
    }

    res.status(200).json(tasks);
  } catch (error) {
    res.status(500).json({ message: "Error fetching tasks", error });
  }
});

// Get a specific task (Anyone can view if they are assigned or responsible)
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (
      req.user.role === "Principal" ||
      task.assignedTo === req.user.role ||
      (req.user.role.startsWith("HOD-") && task.assignedTo.startsWith("Faculty-") && task.assignedTo.includes(req.user.department))
    ) {
      return res.json(task);
    }

    return res.status(403).json({ message: "Access denied" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// Update a task (Only Principal & HODs can update tasks they assigned)
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { title, description } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Ensure only Principal or the HOD who assigned the task can update
    if (
      req.user.role !== "Principal" &&
      !(req.user.role.startsWith("HOD-") && task.assignedTo.startsWith("Faculty-") && task.assignedTo.includes(req.user.department))
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    task.title = title || task.title;
    task.description = description || task.description;
    await task.save();

    res.status(200).json(task);
  } catch (error) {
    res.status(500).json({ message: "Error updating task", error });
  }
});

// Delete a task (Only Principal & HODs can delete tasks they assigned)
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (
      req.user.role !== "Principal" &&
      !(req.user.role.startsWith("HOD-") && task.assignedTo.startsWith("Faculty-") && task.assignedTo.includes(req.user.department))
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    await Task.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Task deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting task", error });
  }
});

module.exports = router;
