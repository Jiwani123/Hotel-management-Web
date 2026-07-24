import CleaningTask from "../../models/CleaningTask.js";
import Notification from "../../models/Notification.js";
import mongoose from "mongoose";
import Employee from "../../models/Employee.js";
import Room from "../../models/Room.js";
import { BadRequestError, NotFoundError } from "../../shared/errors.js";
import { parseDateInput } from "../../shared/dates.js";
import { escapeRegex } from "../../shared/search.js";

function getSlotMinutes() {
  const raw = process.env.CLEANING_SLOT_MINUTES;
  const val = Number(raw ?? 60);
  if (!Number.isFinite(val) || val <= 0) return 60;
  return Math.round(val);
}

function floorToSlot(date, slotMinutes) {
  const d = new Date(date);
  d.setSeconds(0, 0);
  const minutes = d.getMinutes();
  const floored = Math.floor(minutes / slotMinutes) * slotMinutes;
  d.setMinutes(floored, 0, 0);
  return d;
}

async function assertHousekeepingEmployeeAvailable({ employeeId, scheduledAt, excludeTaskId = null }) {
  if (!mongoose.isValidObjectId(employeeId)) throw new BadRequestError("Invalid assigned employee");

  const emp = await Employee.findById(employeeId);
  if (!emp) throw new NotFoundError("Employee not found");
  if (!emp.isActive) throw new BadRequestError("Assigned employee is not active");
  if (emp.role !== "HOUSEKEEPING") throw new BadRequestError("Only HOUSEKEEPING employees can be assigned to cleaning tasks");

  const slotMinutes = getSlotMinutes();
  const slotStart = floorToSlot(scheduledAt, slotMinutes);
  const slotEnd = new Date(slotStart.getTime() + slotMinutes * 60000);

  const conflict = await CleaningTask.findOne({
    ...(excludeTaskId ? { _id: { $ne: excludeTaskId } } : {}),
    assignedTo: employeeId,
    status: { $ne: "DONE" },
    scheduledAt: { $gte: slotStart, $lt: slotEnd },
  }).select("_id scheduledAt roomId");

  if (conflict) {
    throw new BadRequestError("Employee is not available for the selected time slot");
  }
}

async function assertEmployeeTaskIsCurrent({ employeeId, taskId }) {
  const current = await CleaningTask.findOne({
    assignedTo: employeeId,
    status: { $ne: "DONE" },
  })
    .sort({ scheduledAt: 1, createdAt: 1 })
    .select("_id scheduledAt roomId");

  if (current && String(current._id) !== String(taskId)) {
    throw new BadRequestError("Employee must complete the current assigned cleaning task before going to the next cleaning task");
  }
}

export async function createTask(data){ 
  const patch = { ...data };
  const dt = parseDateInput(patch.scheduledAt);
  if (!dt) throw new BadRequestError("Invalid scheduled date/time");
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(patch.scheduledAt).trim())) {
    throw new BadRequestError("Please select a time slot");
  }
  if (dt.getTime() < Date.now()) throw new BadRequestError("Scheduled time must be in the future");
  patch.scheduledAt = dt;

  if (patch.assignedTo) {
    await assertHousekeepingEmployeeAvailable({ employeeId: patch.assignedTo, scheduledAt: patch.scheduledAt });
  }
  const task = await CleaningTask.create(patch);

  await Notification.create({
    userId: task.createdBy,
    title: "Cleaning task created",
    message: `Task ${task._id} scheduled`,
    type: "TASK",
    meta: { taskId: task._id, roomId: task.roomId },
    createdBy: task.createdBy,
  });

  return task;
}

export async function listTasks({ page=1, limit=20, status, roomId, q } = {}) {
  const filter = {};
  if (status) filter.status = status;
  if (roomId) filter.roomId = roomId;

  if (q) {
    const qStr = String(q).trim();
    const rx = new RegExp(escapeRegex(qStr), "i");
    const or = [{ notes: rx }];

    // Direct ObjectId search: task id, roomId, assignedTo.
    if (mongoose.isValidObjectId(qStr)) {
      or.push({ _id: qStr });
      or.push({ roomId: qStr });
      or.push({ assignedTo: qStr });
    } else {
      // Human-friendly search: room number and employee identifiers.
      // This makes the Cleaning search bar useful even when users paste roomNo/empNo/name.
      const [matchingRooms, matchingEmployees] = await Promise.all([
        Room.find({ roomNo: rx }).select("_id").limit(50),
        Employee.find({ $or: [{ empNo: rx }, { name: rx }] }).select("_id").limit(50),
      ]);

      if (matchingRooms.length) {
        or.push({ roomId: { $in: matchingRooms.map((r) => r._id) } });
      }
      if (matchingEmployees.length) {
        or.push({ assignedTo: { $in: matchingEmployees.map((e) => e._id) } });
      }
    }

    filter.$or = or;
  }

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    CleaningTask.find(filter).populate("roomId assignedTo").sort("-scheduledAt").skip(skip).limit(limit),
    CleaningTask.countDocuments(filter),
  ]);
  return { items, total, page, limit, pages: Math.ceil(total/limit) };
}

export async function getTask(id){ return CleaningTask.findById(id).populate("roomId assignedTo"); }

export async function updateTask(id,data){
  const task = await CleaningTask.findById(id);
  if (!task) return null;

  const patch = { ...data };
  const nextScheduledAt = patch.scheduledAt ? parseDateInput(patch.scheduledAt) : task.scheduledAt;
  if (patch.scheduledAt) {
    if (!nextScheduledAt) throw new BadRequestError("Invalid scheduled date/time");
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(patch.scheduledAt).trim())) {
      throw new BadRequestError("Please select a time slot");
    }
    if (nextScheduledAt.getTime() < Date.now()) throw new BadRequestError("Scheduled time must be in the future");
    patch.scheduledAt = nextScheduledAt;
  }

  const assignedToTouched = Object.prototype.hasOwnProperty.call(patch, "assignedTo");
  const nextAssignedTo = assignedToTouched ? patch.assignedTo : task.assignedTo;

  if (nextAssignedTo && (assignedToTouched || patch.scheduledAt)) {
    await assertHousekeepingEmployeeAvailable({
      employeeId: String(nextAssignedTo),
      scheduledAt: patch.scheduledAt ?? task.scheduledAt,
      excludeTaskId: task._id,
    });
  }

  const prevStatus = task.status;
  const nextStatus = patch.status ?? task.status;
  const willComplete = prevStatus !== "DONE" && nextStatus === "DONE";

  if (willComplete && nextAssignedTo) {
    await assertEmployeeTaskIsCurrent({ employeeId: String(nextAssignedTo), taskId: task._id });
  }

  Object.assign(task, patch);
  await task.save();

  if (prevStatus !== "DONE" && task.status === "DONE") {
    await Notification.create({
      userId: task.createdBy,
      title: "Cleaning completed",
      message: `Task ${task._id} marked DONE`,
      type: "TASK",
      meta: { taskId: task._id, roomId: task.roomId },
      createdBy: task.createdBy,
    });
  }

  return CleaningTask.findById(task._id).populate("roomId assignedTo");
}

export async function deleteTask(id){ return CleaningTask.findByIdAndDelete(id); }
