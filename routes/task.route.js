const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Task = require('../models/task');
const authenticate = require('../middleware/authenticate');

const errorhandler = (res, error) => {
    res.status(error.status || 500).json({ error: "Something went wrong! Please try after some time." });
};

// Route to create new Task
router.post("/createTask/:userId", authenticate, async (req, res) => {
    try {
        const { userId } = req.params;
        const { title, checklists, priority, dueDate, phase } = req.body;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ error: "Invalid user ID" });
        }

        if (!title || !checklists || !priority) {
            return res.status(400).json({ error: 'Title, checklists, and priority are required fields.' });
        }
        const totalChecklists = checklists.length;
        const markedChecklists = checklists.filter(item => item.isMarked).length;

        const newTask = new Task({
            userId,
            title,
            checklists,
            priority,
            dueDate,
            phase: phase || 'todo',
            totalChecklists,
            markedChecklists
        });
        await newTask.save();
        res.status(201).json({ taskId: newTask._id, message: "Task created successfully" });
    } catch (error) {
        console.log(error);
        errorhandler(res, error);
    }
});

// Route to fetch all tasks
router.get('/getAllTasks/:userId', authenticate, async (req, res) => {
    try {
        const { userId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ error: "Invalid user ID" });
        }
        let tasks = await Task.find({ userId });

        const filter = req.query.filter;
        if (filter === "today") {
            tasks = tasks.filter(task => isToday(task.createdOn));
        } else if (filter === "yesterday") {
            tasks = tasks.filter(task => isYesterday(task.createdOn));
        } else if (filter === "this_week") {
            tasks = tasks.filter(task => isWithinLastNDays(task.createdOn, 7));
        } else if (filter === "this_month") {
            tasks = tasks.filter(task => isWithinLastNDays(task.createdOn, 30));
        }
        const groupedTasks = {
            backlog: [],
            todo: [],
            inProgress: [],
            done: []
        };
        tasks.forEach(task => {
            groupedTasks[task.phase].push({
                title: task.title,
                priority: task.priority,
                createdOn: task.createdOn,
                dueDate: task.dueDate,
                taskId: task._id,
                phase: task.phase,
                checklists: task.checklists,
                totalChecklists: task.totalChecklists,
                markedChecklists: task.markedChecklists
            });
        });
        res.status(200).json({ groupedTasks });
    } catch (error) {
        console.log(error);
        errorhandler(res, error);
    }
});

// Helper functions to check date ranges
const isToday = (date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();
};

const isYesterday = (date) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return date.getDate() === yesterday.getDate() &&
        date.getMonth() === yesterday.getMonth() &&
        date.getFullYear() === yesterday.getFullYear();
};

const isWithinLastNDays = (date, n) => {
    const today = new Date();
    const daysAgo = new Date(today.setDate(today.getDate() - n));
    return date >= daysAgo && date <= new Date();
};

// Routes to analytics tasks
router.get("/analytics/:userId", authenticate, async (req, res) => {
    try {
        const { userId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ error: "Invalid user ID" });
        }

        const tasks = await Task.find({ userId });
        let phaseCounts = {
            backlog: 0,
            todo: 0,
            inProgress: 0,
            done: 0
        };
        let priorityCounts = {
            low: 0,
            moderate: 0,
            high: 0
        };
        let dueDateNotPassedCount = 0;
        tasks.forEach(task => {
            phaseCounts[task.phase]++;
            priorityCounts[task.priority]++;
            if (task.dueDate && task.phase !== "done") {
                dueDateNotPassedCount++;
            }
        });
        const analyticsData = {
            phaseCounts,
            priorityCounts,
            dueDateNotPassedCount
        };
        res.json(analyticsData);

    } catch (error) {
        console.log(error);
        errorhandler(res, error);
    }
});
// Router to delete Task
router.delete("/deleteTask/:userId/:taskId", authenticate, async (req, res) => {
    try {
        const { userId, taskId } = req.params;
        if (
            !mongoose.Types.ObjectId.isValid(userId) ||
            !mongoose.Types.ObjectId.isValid(taskId)
        ) {
            return res.status(400).json({ error: "Invalid user or task ID " });
        }

        const task = await Task.findOne({ userId, _id: taskId });

        if (!task) {
            return res.status(404).json({ error: "Task not found" });
        }
        await Task.deleteOne({ _id: taskId });

        res.status(200).json({ message: "Task deleted successfully" });
    } catch (error) {
        console.log(error);
        errorhandler(res, error);
    }
});

// Router to Edit the Task
router.put("/editTask/:userId/:taskId", authenticate, async (req, res) => {
    try {
        const { userId, taskId } = req.params;
        const { title, checklists, priority, dueDate } = req.body;

        if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(taskId)) {
            return res.status(400).json({ error: "Invalid user ID or task ID" });
        }

        const task = await Task.findOne({ userId, _id: taskId });

        if (!task) {
            return res.status(404).json({ error: "Task not found" });
        }

        task.title = title || task.title;
        task.checklists = checklists || task.checklists;
        task.priority = priority || task.priority;
        task.dueDate = dueDate || task.dueDate;

        task.totalChecklists = task.checklists.length;
        task.markedChecklists = task.checklists.filter(item => item.isMarked).length;

        await task.save();

        res.status(200).json({ message: "Task updated successfully" });
    } catch (error) {
        console.log(error);
        errorhandler(res, error);
    }
});
// Route to update phase
router.put('/updatePhase/:userId/:taskId', authenticate, async (req, res) => {
    try {
        const { userId, taskId } = req.params;
        const { phase } = req.body;

        if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(taskId)) {
            return res.status(400).json({ error: "Invalid user ID or task ID" });
        }
        const task = await Task.findOne({ userId, _id: taskId });
        if (!task) {
            return res.status(404).json({ error: "Task not found" });
        }

        // create a new task with same details with updated phase
        const newTask = new Task({
            _id: taskId,
            userId: userId,
            title: task.title,
            checklists: task.checklists,
            priority: task.priority,
            dueDate: task.dueDate,
            phase: phase,
            createdOn: task.createdOn,
            totalChecklists: task.totalChecklists,
            markedChecklists: task.markedChecklists
        });
        // Remove the task from its current position
        await Task.deleteOne({ _id: taskId });
        // Save the task to the database
        await newTask.save();
        // Update the phase of the task
        task.phase = phase;

        // Append the task to the end of the database
        await task.save();

        return res.status(200).json({
            message: "Task phase updated successfully",
        });

    } catch (error) {
        console.log(error);
        errorhandler(res, error);
    }
});

router.get("/:taskId", async (req, res) => {
    try {
        const { taskId } = req.params;
        const task = await Task.findById(taskId);
        if (!task) {
            return res.status(404).json({ error: "Task not found" });
        }
        const taskDetails = {
            title: task.title,
            priority: task.priority,
            totalChecklists: task.totalChecklists,
            markedChecklists: task.markedChecklists,
            dueDate: task.dueDate,
            checklists: task.checklists.map(checklist => ({
                title: checklist.title,
                isMarked: checklist.isMarked
            }))
        };

        res.status(200).json(taskDetails);
    } catch (error) {
        console.log(error);
        errorhandler(res, error);
    }
});

module.exports = router;
