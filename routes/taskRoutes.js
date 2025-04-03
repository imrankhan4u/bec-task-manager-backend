const express = require("express");
const router = express.Router();
const Task = require("../models/Task");
const User = require("../models/User");
const { authMiddleware } = require("../middleware/authMiddleware");


// create a task
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { title, description, assignedTo, priority, dueDate  } = req.body;
    const assignedBy = req.user._id;

    if (!title || !description || !assignedTo || !priority || !dueDate) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Validate assignedTo user
    const assignedUser = await User.findById(assignedTo);
    if (!assignedUser) {
      return res.status(404).json({ message: "Assigned user not found" });
    }

    const assignerRole = req.user.role;
    const assigneeRole = assignedUser.role;

    // Role-based restrictions
    if (assignerRole === "Principal" && !assigneeRole.startsWith("HOD-")) {
      return res.status(403).json({ message: "Principal can only assign tasks to HODs" });
    }
    if (assignerRole.startsWith("HOD-") && !assigneeRole.startsWith("Faculty-")) {
      return res.status(403).json({ message: "HOD can only assign tasks to Faculty" });
    }
    if (assignerRole.startsWith("Faculty-")) {
      return res.status(403).json({ message: "Faculty cannot assign tasks" });
    }

    const newTask = new Task({ title, description, assignedTo, assignedBy, priority, dueDate  });
    await newTask.save();
    res.status(201).json(newTask);
  } catch (error) {
    res.status(500).json({ message: "Error creating task", error });
  }
});


// Fetch tasks assigned by the logged-in user with pagination
router.get("/assigned", authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;
    const assignedTasks = await Task.find({ assignedBy: req.user._id })
      .populate("assignedTo", "name role")
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    res.status(200).json(assignedTasks);
  } catch (error) {
    res.status(500).json({ message: "Error fetching assigned tasks", error });
  }
});

// Fetch tasks assigned to the logged-in user
router.get("/received", authMiddleware, async (req, res) => {
  try {
    const receivedTasks = await Task.find({ assignedTo: req.user._id })
      .populate("assignedBy", "name role")
      .sort({ createdAt: -1 });
    res.status(200).json(receivedTasks);
  } catch (error) {
    res.status(500).json({ message: "Error fetching received tasks", error });
  }
});

// Update a task (Only the assigner can update)
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { title, description, dueDate, assignedTo, priority } = req.body;
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });
    if (task.assignedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the assigner can update this task" });
    }

    if (assignedTo) {
      const userExists = await User.findById(assignedTo);
      if (!userExists) {
        return res.status(404).json({ message: "Assigned user not found" });
      }
      task.assignedTo = assignedTo;
    }

    task.title = title || task.title;
    task.description = description || task.description;
    task.dueDate = dueDate || task.dueDate;
    task.priority = priority || task.priority;
    await task.save();

    res.status(200).json({ message: "Task updated successfully", task });
  } catch (error) {
    res.status(500).json({ message: "Error updating task", error });
  }
});

// Mark a task as completed
router.put("/:id/complete", authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    if (!["In Progress", "Completed"].includes(status)) {
      return res.status(400).json({ message: "Invalid status. Use 'In Progress' or 'Completed'" });
    }

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });
    if (task.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the assigned user can update the status" });
    }

    task.status = status;
    if (status === "Completed") task.completedAt = new Date();
    await task.save();
    res.status(200).json({ message: `Task marked as ${status}`, task });
  } catch (error) {
    res.status(500).json({ message: "Error updating task status", error });
  }
});

// Delete a task (Only assigner can delete)
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });
    if (task.assignedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the assigner can delete this task" });
    }

    await Task.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Task deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting task", error });
  }
});

// This route is for testing purpose onplay, later comment it
// Fetch all tasks (Admin only)
router.get("/all", authMiddleware, async (req, res) => {
  try {
    // Check if the logged-in user is an Admin
    if (req.user.role !== "Admin") {
      return res.status(403).json({ message: "Access denied. Admins only" });
    }

    // Fetch all tasks with assignedBy and assignedTo details
    const tasks = await Task.find({})
      .populate("assignedBy", "_id name role")
      .populate("assignedTo", "_id name role")
      .sort({ createdAt: -1 });

    res.status(200).json(tasks);
  } catch (error) {
    res.status(500).json({ message: "Error fetching all tasks", error });
  }
});


module.exports = router;
