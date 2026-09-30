import Select from "./Select";

// Option sets are exported so Tasks.jsx can still reference them
// without re-defining them locally.

export const PRIORITY_OPTIONS = [
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" }
];

// Effort = how much energy the task DEMANDS.
// SHIFT matches this against the energy you report at check-in.
// Priority is importance, not energy.
export const EFFORT_OPTIONS = [
    { value: "low", label: "Low — light lift" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High — heavy lift" }
];

export const TYPE_OPTIONS = [
    { value: "oneoff", label: "One-time — clears once done" },
    { value: "permanent", label: "Permanent — stays, counts every time" }
];

// The six task fields shared by the Tasks creation form and the History
// "Add Completed Task" modal. Accepts controlled values + setters as props.
// categoryOptions is a sorted string array for the datalist autocomplete;
// pass an empty array if categories aren't available.
//
// datalistId lets the caller namespace the <datalist> id so two instances
// on the same page don't collide (Task page + History modal open at same time
// is edge-case-unlikely, but let's be proper).
function TaskFormFields({
    title, setTitle,
    category, setCategory,
    estimatedTime, setEstimatedTime,
    priority, setPriority,
    effort, setEffort,
    type, setType,
    categoryOptions = [],
    datalistId = "task-category-opts"
}) {
    return (
        <>
            <div className="input-group">
                <label>Task</label>
                <input
                    placeholder="e.g. Practice React"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                />
            </div>

            <div className="form-row">
                <div className="input-group">
                    <label>Category</label>
                    <input
                        placeholder="e.g. CS"
                        list={datalistId}
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                    />
                    <datalist id={datalistId}>
                        {categoryOptions.map((c) => (
                            <option key={c} value={c} />
                        ))}
                    </datalist>
                </div>

                <div className="input-group">
                    <label>Time</label>
                    <input
                        type="number"
                        min="1"
                        placeholder="Minutes"
                        value={estimatedTime}
                        onChange={(e) => setEstimatedTime(e.target.value)}
                    />
                </div>

                <div className="input-group">
                    <label>Priority</label>
                    <Select
                        value={priority}
                        onChange={setPriority}
                        options={PRIORITY_OPTIONS}
                    />
                </div>

                <div className="input-group">
                    <label>Effort</label>
                    <Select
                        value={effort}
                        onChange={setEffort}
                        options={EFFORT_OPTIONS}
                    />
                </div>
            </div>

            <div className="input-group">
                <label>Type</label>
                <Select
                    value={type}
                    onChange={setType}
                    options={TYPE_OPTIONS}
                />
            </div>
        </>
    );
}

export default TaskFormFields;
