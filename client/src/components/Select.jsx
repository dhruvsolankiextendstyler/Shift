import { useEffect, useRef, useState } from "react";

// App-themed dropdown replacing the native <select> (which renders the OS
// picker). Click-out + Escape to close; options are styled buttons.
function Select({ value, onChange, options, id }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const current = options.find((o) => o.value === value);

    useEffect(() => {
        if (!open) return;

        const onDown = (e) => {
            if (ref.current && !ref.current.contains(e.target)) {
                setOpen(false);
            }
        };
        const onKey = (e) => {
            if (e.key === "Escape") setOpen(false);
        };

        document.addEventListener("mousedown", onDown);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onDown);
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);

    return (
        <div className={`select ${open ? "open" : ""}`} ref={ref}>
            <button
                type="button"
                id={id}
                className="select-trigger"
                aria-haspopup="listbox"
                aria-expanded={open}
                onClick={() => setOpen((o) => !o)}
            >
                <span>{current?.label ?? "Select..."}</span>
                <span className="select-caret">▾</span>
            </button>

            {open && (
                <ul className="select-menu" role="listbox">
                    {options.map((o) => (
                        <li key={o.value}>
                            <button
                                type="button"
                                role="option"
                                aria-selected={o.value === value}
                                className={`select-option ${o.value === value ? "selected" : ""}`}
                                onClick={() => {
                                    onChange(o.value);
                                    setOpen(false);
                                }}
                            >
                                {o.label}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default Select;
