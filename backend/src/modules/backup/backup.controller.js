import { ok } from "../../shared/apiResponse.js";
import { exportData, restoreData } from "./backup.service.js";

export async function exportBackup(req, res, next) {
  try {
    const data = await exportData();
    return ok(res, data, "Backup export");
  } catch (e) { return next(e); }
}

export async function restoreBackup(req, res, next) {
  try {
    const result = await restoreData(req.body);
    return ok(res, result, "Backup restored");
  } catch (e) { return next(e); }
}
