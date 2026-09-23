import { apiFetch } from "./api";

// Reflect a completed action on its task: permanent tasks stay in the pool
// and just bump their tally, one-off tasks get marked done. Shared by the
// focus lock and the History "mark done" control.
export function reflectCompletionOnTask(task) {
    return apiFetch(`/tasks/${task._id}`, {
        method: "PUT",
        body: JSON.stringify(
            task.type === "permanent"
                ? { incrementCompletion: true }
                : { status: "completed" }
        )
    });
}
